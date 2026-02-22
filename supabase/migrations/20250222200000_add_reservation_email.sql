-- 予約にお客様メールアドレス（email）を追加

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS email text;

-- 引数が変わるため一度 DROP してから再作成
DROP FUNCTION IF EXISTS public.create_reservation(uuid, text, text, text, text);

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
