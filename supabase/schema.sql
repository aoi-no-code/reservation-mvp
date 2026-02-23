-- ============================================
-- 3枠限定予約 MVP - Supabase スキーマ（仕様変更後）
-- ============================================
-- 【新規プロジェクトのみ】このファイルを Supabase SQL Editor で実行する。
-- すでに slots / reservations がある既存DBの場合は実行せず、
-- supabase/migrations/20250222000000_spec_change.sql を実行してください。

-- --------------------------------------------
-- 1. テーブル作成
-- --------------------------------------------

-- 美容師（多人数対応用）
CREATE TABLE IF NOT EXISTS public.stylists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  instagram_id text,
  auth_user_id uuid,  -- Supabase Auth の user id（auth.users.id と対応）
  hourly_rate int,    -- おおよそ1時間あたりの金額（円）。表示用「約¥3,000/1h」など
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 表示・予約対象の枠（1枠 = 1予約、定員は常に1のため capacity なし）
CREATE TABLE IF NOT EXISTS public.slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id uuid NOT NULL REFERENCES public.stylists(id) ON DELETE RESTRICT,
  start_at timestamptz NOT NULL,
  label text NOT NULL,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 予約（名前・電話番号・メール・インスタID・メニュー自由記入）
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,       -- お客様のメールアドレス（任意）
  instagram_id text,
  menu_note text,   -- なんのメニューか簡単に自由記入
  created_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_stylists_auth_user_id ON public.stylists(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_slots_stylist_id ON public.slots(stylist_id);
CREATE INDEX IF NOT EXISTS idx_slots_is_active_start ON public.slots(is_active, start_at);
CREATE INDEX IF NOT EXISTS idx_reservations_slot_id ON public.reservations(slot_id);

-- --------------------------------------------
-- 2. 原子的に予約を確定する RPC（1枠1予約）
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.create_reservation(
  p_slot_id uuid,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
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
  -- スロットを行ロックして取得（有効かつ未予約のみ）
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

  INSERT INTO public.reservations (slot_id, name, phone, email, instagram_id, menu_note)
  VALUES (p_slot_id, p_name, p_phone, NULLIF(TRIM(p_email), ''), NULLIF(TRIM(p_instagram_id), ''), NULLIF(TRIM(p_menu_note), ''))
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_reservation(uuid, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_reservation(uuid, text, text, text, text, text) TO authenticated;

-- 公開用: 表示用スロット一覧＋残り枠(0/1)＋美容師名・1時間あたりの金額
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

-- --------------------------------------------
-- 3. RLS 有効化
-- --------------------------------------------
ALTER TABLE public.stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- 4. RLS ポリシー
-- --------------------------------------------

-- stylists: 認証済み（管理者）のみ全操作。anon は get_public_slots 経由で名前・金額のみ見える
CREATE POLICY "stylists_admin_all"
  ON public.stylists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- slots: 公開は is_active=true のみ SELECT 可能
CREATE POLICY "slots_public_select_active"
  ON public.slots FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "slots_admin_all"
  ON public.slots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- reservations: テーブル直 INSERT は禁止（RPC 経由のみ）
CREATE POLICY "reservations_admin_select"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (true);

