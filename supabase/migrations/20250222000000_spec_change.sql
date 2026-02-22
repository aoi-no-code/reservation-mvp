-- 既存DBを新仕様に移行するマイグレーション
-- 新規セットアップの場合は schema.sql をそのまま実行してください。
-- ※ schema.sql を既存DBで実行してエラーになった場合も、このファイルを実行してください。

-- 0. ビューを先に削除（stylist_id 参照で失敗している場合のため）
DROP VIEW IF EXISTS public.slots_with_remaining;

-- 1. 美容師テーブル追加
CREATE TABLE IF NOT EXISTS public.stylists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  instagram_id text,
  auth_user_id uuid,
  hourly_rate int,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stylists_auth_user_id ON public.stylists(auth_user_id);

-- 既存の slots がある場合、仮の美容師を1件作成して紐づける
INSERT INTO public.stylists (id, name, instagram_id, hourly_rate, email)
SELECT gen_random_uuid(), '未設定', NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.stylists LIMIT 1)
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'slots');

-- 2. slots: capacity 削除、stylist_id 追加
DO $$
DECLARE
  v_placeholder_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'slots' AND column_name = 'capacity') THEN
    SELECT id INTO v_placeholder_id FROM public.stylists ORDER BY created_at ASC LIMIT 1;
    IF v_placeholder_id IS NOT NULL THEN
      ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS stylist_id uuid REFERENCES public.stylists(id) ON DELETE RESTRICT;
      UPDATE public.slots SET stylist_id = v_placeholder_id WHERE stylist_id IS NULL;
      ALTER TABLE public.slots ALTER COLUMN stylist_id SET NOT NULL;
    END IF;
    ALTER TABLE public.slots DROP COLUMN IF EXISTS capacity;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_slots_stylist_id ON public.slots(stylist_id);

-- 3. reservations: contact/memo を phone/instagram_id/menu_note に移行
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS instagram_id text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS menu_note text;

UPDATE public.reservations SET phone = contact WHERE phone IS NULL AND contact IS NOT NULL;
UPDATE public.reservations SET menu_note = memo WHERE menu_note IS NULL AND memo IS NOT NULL;

ALTER TABLE public.reservations ALTER COLUMN phone SET DEFAULT '';
UPDATE public.reservations SET phone = '' WHERE phone IS NULL;
ALTER TABLE public.reservations ALTER COLUMN phone SET NOT NULL;

ALTER TABLE public.reservations DROP COLUMN IF EXISTS contact;
ALTER TABLE public.reservations DROP COLUMN IF EXISTS memo;

-- 4. RPC 更新（既存の create_reservation は引数が変わるため DROP して再作成）
DROP FUNCTION IF EXISTS public.create_reservation(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.create_reservation(
  p_slot_id uuid,
  p_name text,
  p_phone text,
  p_instagram_id text DEFAULT NULL,
  p_menu_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id uuid;
  v_count int;
  v_reservation_id uuid;
BEGIN
  SELECT id INTO v_slot_id
  FROM public.slots
  WHERE id = p_slot_id AND is_active = true
  FOR UPDATE;

  IF v_slot_id IS NULL THEN
    RAISE EXCEPTION 'invalid_slot' USING errcode = 'P0001';
  END IF;

  SELECT COUNT(*)::int INTO v_count
  FROM public.reservations
  WHERE slot_id = p_slot_id;

  IF v_count >= 1 THEN
    RAISE EXCEPTION 'slot_full' USING errcode = 'P0002';
  END IF;

  INSERT INTO public.reservations (slot_id, name, phone, instagram_id, menu_note)
  VALUES (p_slot_id, p_name, p_phone, NULLIF(TRIM(p_instagram_id), ''), NULLIF(TRIM(p_menu_note), ''))
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_reservation(uuid, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_reservation(uuid, text, text, text, text) TO authenticated;

-- 5. get_public_slots 更新（戻り型が変わるため一度 DROP してから再作成）
DROP FUNCTION IF EXISTS public.get_public_slots();

CREATE OR REPLACE FUNCTION public.get_public_slots()
RETURNS TABLE (
  id uuid,
  start_at timestamptz,
  label text,
  note text,
  remaining int,
  stylist_name text,
  stylist_hourly_rate int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    s.id,
    s.start_at,
    s.label,
    s.note,
    (1 - COALESCE(r.cnt, 0))::int AS remaining,
    st.name AS stylist_name,
    st.hourly_rate AS stylist_hourly_rate
  FROM public.slots s
  JOIN public.stylists st ON st.id = s.stylist_id
  LEFT JOIN (
    SELECT slot_id, COUNT(*)::int AS cnt
    FROM public.reservations
    GROUP BY slot_id
  ) r ON s.id = r.slot_id
  WHERE s.is_active = true
    AND s.start_at >= now()
  ORDER BY s.start_at ASC
  LIMIT 3;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_slots() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_slots() TO authenticated;

-- 6. ビュー更新
DROP VIEW IF EXISTS public.slots_with_remaining;

CREATE OR REPLACE VIEW public.slots_with_remaining AS
SELECT
  s.id,
  s.stylist_id,
  s.start_at,
  s.label,
  s.note,
  s.is_active,
  s.created_at,
  (1 - COALESCE(r.cnt, 0)) AS remaining
FROM public.slots s
LEFT JOIN (
  SELECT slot_id, COUNT(*)::int AS cnt
  FROM public.reservations
  GROUP BY slot_id
) r ON s.id = r.slot_id;

ALTER VIEW public.slots_with_remaining SET (security_invoker = on);

-- 7. stylists RLS（既存で有効化されていなければ）
ALTER TABLE public.stylists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stylists_admin_all" ON public.stylists;
CREATE POLICY "stylists_admin_all"
  ON public.stylists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
