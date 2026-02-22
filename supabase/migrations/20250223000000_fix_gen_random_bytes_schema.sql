-- pgcrypto が extensions スキーマにあるため、create_reservation 内で extensions.gen_random_bytes を参照するよう修正
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
