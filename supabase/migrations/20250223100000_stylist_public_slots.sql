-- 美容師ごとの公開予約ページ用: 指定美容師の公開枠取得・表示名取得

-- 指定美容師の表示名（anon でも参照可能）
CREATE OR REPLACE FUNCTION public.get_stylist_public_name(p_stylist_id uuid)
RETURNS TABLE(name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT st.name
  FROM public.stylists st
  WHERE st.id = p_stylist_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_stylist_public_name(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_stylist_public_name(uuid) TO authenticated;

-- 指定美容師の公開枠一覧（get_public_slots と同じ形・条件、stylist_id で絞り込み）
CREATE OR REPLACE FUNCTION public.get_public_slots_by_stylist(p_stylist_id uuid)
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
  WHERE s.stylist_id = p_stylist_id
    AND s.is_active = true
    AND s.start_at >= now()
  ORDER BY s.start_at ASC
  LIMIT 3;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_slots_by_stylist(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_slots_by_stylist(uuid) TO authenticated;
