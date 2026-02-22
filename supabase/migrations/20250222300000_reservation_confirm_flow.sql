-- 予約「確認リンクで確定」フロー用: confirmation_token, confirmed_at 追加
-- 20250222200000_add_reservation_email の後に実行すること（create_reservation は 6 引数で再定義）
-- gen_random_bytes 利用のため pgcrypto を有効化（Supabase では通常 extensions スキーマに作成済みの場合はそのまま利用）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS confirmation_token text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_confirmation_token
  ON public.reservations (confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- create_reservation: 仮登録（token をセット、confirmed_at は NULL）。戻り値は (reservation_id, confirmation_token)
DROP FUNCTION IF EXISTS public.create_reservation(uuid, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_reservation(
  p_slot_id uuid,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_instagram_id text DEFAULT NULL,
  p_menu_note text DEFAULT NULL
)
RETURNS TABLE(reservation_id uuid, confirmation_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_slot_id uuid;
  v_count int;
  v_reservation_id uuid;
  v_token text;
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

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.reservations (slot_id, name, phone, email, instagram_id, menu_note, confirmation_token)
  VALUES (p_slot_id, p_name, p_phone, NULLIF(TRIM(p_email), ''), NULLIF(TRIM(p_instagram_id), ''), NULLIF(TRIM(p_menu_note), ''), v_token)
  RETURNING id INTO v_reservation_id;

  reservation_id := v_reservation_id;
  confirmation_token := v_token;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_reservation(uuid, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_reservation(uuid, text, text, text, text, text) TO authenticated;

-- 確認リンククリックで予約確定（confirmed_at をセット）
CREATE OR REPLACE FUNCTION public.confirm_reservation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id uuid;
BEGIN
  UPDATE public.reservations
  SET confirmed_at = now()
  WHERE confirmation_token = p_token
    AND confirmed_at IS NULL
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_reservation(text) TO anon;
GRANT EXECUTE ON FUNCTION public.confirm_reservation(text) TO authenticated;
