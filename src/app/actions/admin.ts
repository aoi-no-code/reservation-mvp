'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Reservation, Slot, Stylist } from '@/types/db';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();

export async function isAdmin(): Promise<boolean> {
  if (!ADMIN_EMAIL) return false;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/** ログイン中のユーザーに紐づくスタイリストを取得（美容師本人用） */
export async function getCurrentStylist(): Promise<Stylist | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('stylists')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  return (data ?? null) as Stylist | null;
}

/** スタイリストの今後の枠と予約一覧（本人のみ取得可能） */
export async function getStylistSlotsWithReservations(stylistId: string): Promise<{
  slots: Slot[];
  reservationsBySlotId: Record<string, Reservation>;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { slots: [], reservationsBySlotId: {} };
  const { data: stylist } = await supabase
    .from('stylists')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('id', stylistId)
    .single();
  if (!stylist) return { slots: [], reservationsBySlotId: {} };

  const now = new Date().toISOString();
  const { data: slots } = await supabase
    .from('slots')
    .select('*')
    .eq('stylist_id', stylistId)
    .gte('start_at', now)
    .order('start_at', { ascending: true })
    .limit(30);
  const slotList = (slots ?? []) as Slot[];
  const slotIds = slotList.map((s) => s.id);
  if (slotIds.length === 0) return { slots: slotList, reservationsBySlotId: {} };

  const { data: reservations } = await supabase
    .from('reservations')
    .select('*')
    .in('slot_id', slotIds);
  const resList = (reservations ?? []) as Reservation[];
  const reservationsBySlotId: Record<string, Reservation> = {};
  for (const r of resList) reservationsBySlotId[r.slot_id] = r;
  return { slots: slotList, reservationsBySlotId };
}

/** 美容師本人が自分の枠を1件追加（本人のみ実行可能） */
export async function createSlotAsStylist(
  start_at: string,
  label: string,
  note: string | null,
  is_active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const stylist = await getCurrentStylist();
  if (!stylist) return { ok: false, error: 'ログイン中のスタイリストが見つかりません' };
  const supabase = await createClient();
  const { error } = await supabase.from('slots').insert({
    stylist_id: stylist.id,
    start_at,
    label: label.trim(),
    note: note?.trim() || null,
    is_active,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 美容師本人が自分の枠を1件更新（本人のみ実行可能） */
export async function updateSlotAsStylist(
  slotId: string,
  start_at: string,
  label: string,
  note: string | null,
  is_active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const stylist = await getCurrentStylist();
  if (!stylist) return { ok: false, error: 'ログイン中のスタイリストが見つかりません' };
  const supabase = await createClient();
  const { data: slot } = await supabase
    .from('slots')
    .select('id')
    .eq('id', slotId)
    .eq('stylist_id', stylist.id)
    .single();
  if (!slot) return { ok: false, error: '枠が見つからないか、編集権限がありません' };
  const { error } = await supabase
    .from('slots')
    .update({
      start_at,
      label: label.trim(),
      note: note?.trim() || null,
      is_active,
    })
    .eq('id', slotId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 美容師本人が自分の枠を1件削除（本人のみ実行可能） */
export async function deleteSlotAsStylist(slotId: string): Promise<{ ok: boolean; error?: string }> {
  const stylist = await getCurrentStylist();
  if (!stylist) return { ok: false, error: 'ログイン中のスタイリストが見つかりません' };
  const supabase = await createClient();
  const { data: slot } = await supabase
    .from('slots')
    .select('id')
    .eq('id', slotId)
    .eq('stylist_id', stylist.id)
    .single();
  if (!slot) return { ok: false, error: '枠が見つからないか、削除権限がありません' };
  const { error } = await supabase.from('slots').delete().eq('id', slotId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getStylistsForAdmin(): Promise<Stylist[]> {
  const ok = await isAdmin();
  if (!ok) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('stylists')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    console.error('getStylistsForAdmin error', error);
    return [];
  }
  return (data ?? []) as Stylist[];
}

export async function getSlotsForAdmin(): Promise<Slot[]> {
  const ok = await isAdmin();
  if (!ok) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('slots')
    .select('*')
    .order('start_at', { ascending: true });
  if (error) {
    console.error('getSlotsForAdmin error', error);
    return [];
  }
  return (data ?? []) as Slot[];
}

export async function getReservationCountsBySlot(): Promise<Record<string, number>> {
  const ok = await isAdmin();
  if (!ok) return {};
  const admin = createAdminClient();
  const { data, error } = await admin.from('reservations').select('slot_id');
  if (error) return {};
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.slot_id] = (counts[row.slot_id] ?? 0) + 1;
  }
  return counts;
}

export async function createStylist(
  name: string,
  instagram_id: string | null,
  auth_user_id: string | null,
  hourly_rate: number | null,
  email: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: 'Forbidden' };
  const admin = createAdminClient();
  const { error } = await admin.from('stylists').insert({
    name: name.trim(),
    instagram_id: instagram_id?.trim() || null,
    auth_user_id: auth_user_id || null,
    hourly_rate: hourly_rate ?? null,
    email: email?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateStylist(
  id: string,
  name: string,
  instagram_id: string | null,
  auth_user_id: string | null,
  hourly_rate: number | null,
  email: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: 'Forbidden' };
  const admin = createAdminClient();
  const { error } = await admin.from('stylists').update({
    name: name.trim(),
    instagram_id: instagram_id?.trim() || null,
    auth_user_id: auth_user_id || null,
    hourly_rate: hourly_rate ?? null,
    email: email?.trim() || null,
  }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createSlot(
  stylist_id: string,
  start_at: string,
  label: string,
  note: string | null,
  is_active: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: 'Forbidden' };
  const admin = createAdminClient();
  const { error } = await admin.from('slots').insert({
    stylist_id,
    start_at,
    label,
    note: note || null,
    is_active,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateSlot(
  id: string,
  stylist_id: string,
  start_at: string,
  label: string,
  note: string | null,
  is_active: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: 'Forbidden' };
  const admin = createAdminClient();
  const { error } = await admin.from('slots').update({
    stylist_id,
    start_at,
    label,
    note: note || null,
    is_active,
  }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteSlot(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: 'Forbidden' };
  const admin = createAdminClient();
  const { error } = await admin.from('slots').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
