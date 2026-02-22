'use server';

import { createClient } from '@/lib/supabase/server';
import type { PublicSlotRow } from '@/types/db';
import { sendConfirmEmailToCustomer } from '@/lib/email';

export async function getPublicSlots(): Promise<PublicSlotRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_slots');
  if (error) {
    console.error('get_public_slots error', error);
    return [];
  }
  return (data ?? []) as PublicSlotRow[];
}

export async function getPublicSlotsByStylist(stylistId: string): Promise<PublicSlotRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_slots_by_stylist', { p_stylist_id: stylistId });
  if (error) {
    console.error('get_public_slots_by_stylist error', error);
    return [];
  }
  return (data ?? []) as PublicSlotRow[];
}

/** 美容師の表示名（公開用）。存在しない場合は null */
export async function getStylistPublicName(stylistId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_stylist_public_name', { p_stylist_id: stylistId });
  if (error) {
    console.error('get_stylist_public_name error', error);
    return null;
  }
  const rows = (data ?? []) as { name: string }[];
  return rows.length > 0 ? rows[0].name : null;
}

export type CreateReservationResult =
  | { ok: true; reservationId: string }
  | { ok: false; code: 'slot_full' | 'invalid_slot' | 'email_required' | 'error'; message?: string };

export async function createReservation(
  slotId: string,
  name: string,
  phone: string,
  email: string | null,
  instagramId: string | null,
  menuNote: string | null,
  slotLabelForEmail: string
): Promise<CreateReservationResult> {
  const trimmedEmail = email?.trim() || null;
  if (!trimmedEmail) {
    return { ok: false, code: 'email_required', message: '確認メールを送るため、メールアドレスを入力してください。' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_reservation', {
    p_slot_id: slotId,
    p_name: name.trim(),
    p_phone: phone.trim(),
    p_email: trimmedEmail,
    p_instagram_id: instagramId?.trim() || null,
    p_menu_note: menuNote?.trim() || null,
  });

  if (error) {
    if (error.code === 'P0002' || error.message?.includes('slot_full')) {
      return { ok: false, code: 'slot_full', message: 'この枠はすでに埋まりました。' };
    }
    if (error.code === 'P0001' || error.message?.includes('invalid_slot')) {
      return { ok: false, code: 'invalid_slot', message: '無効な枠です。' };
    }
    console.error('create_reservation error', error);
    return { ok: false, code: 'error', message: error.message };
  }

  const row = Array.isArray(data) && data.length > 0 ? data[0] : data;
  const reservationId = row?.reservation_id ?? row?.reservation_id;
  const confirmationToken = row?.confirmation_token ?? row?.confirmation_token;
  if (!reservationId || !confirmationToken) {
    console.error('create_reservation unexpected response', data);
    return { ok: false, code: 'error', message: '予約の登録に失敗しました。' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const confirmUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/confirm/${confirmationToken}` : '';
  const emailResult = await sendConfirmEmailToCustomer(trimmedEmail, confirmUrl, slotLabelForEmail || 'ご予約枠');
  if (!emailResult.ok) {
    console.error('sendConfirmEmailToCustomer failed', emailResult.error);
    return { ok: false, code: 'error', message: '確認メールの送信に失敗しました。しばらくしてから再度お試しください。' };
  }

  return { ok: true, reservationId: reservationId as string };
}
