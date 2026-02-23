import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendConfirmedEmailToStylist } from '@/lib/email';
import { formatMonthDayTimeJst } from '@/lib/datetime';
import { getSlotLabelDisplay } from '@/lib/labels';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token?.trim()) {
    return NextResponse.redirect(new URL('/?error=invalid', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
  }

  const supabase = await createClient();
  const { data: reservationId, error: confirmError } = await supabase.rpc('confirm_reservation', {
    p_token: token.trim(),
  });

  if (confirmError || !reservationId) {
    console.error('confirm_reservation error', confirmError);
    return NextResponse.redirect(
      new URL('/?error=confirm_failed', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    );
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from('reservations')
    .select('name, phone, menu_note, slots(start_at, label, stylists(name, email))')
    .eq('id', reservationId)
    .single();

  type SlotRow = { start_at: string; label: string; stylists: { name: string; email: string | null }[] | null };
  if (row?.slots && typeof row.slots === 'object' && row.slots !== null) {
    const slotsRaw = row.slots as unknown as SlotRow | SlotRow[];
    const slot = Array.isArray(slotsRaw) ? slotsRaw[0] : slotsRaw;
    const stylistsArr = slot?.stylists && Array.isArray(slot.stylists) ? slot.stylists : [];
    const stylist = stylistsArr[0] ?? null;
    const stylistEmail = stylist?.email;
    if (stylistEmail) {
      const dateTime = formatMonthDayTimeJst(slot.start_at);
      const label = getSlotLabelDisplay(slot.label);
      await sendConfirmedEmailToStylist(
        stylistEmail,
        (row.name as string) ?? '',
        label,
        dateTime,
        (row.phone as string) ?? '',
        (row.menu_note as string) || null
      );
    }
  }

  const slotsForRedirect = row?.slots as unknown as SlotRow | SlotRow[] | undefined;
  const slot = slotsForRedirect
    ? Array.isArray(slotsForRedirect)
      ? slotsForRedirect[0]
      : slotsForRedirect
    : undefined;
  let slotLabel = '';
  let labelParam = '';
  if (slot) {
    slotLabel = formatMonthDayTimeJst(slot.start_at);
    labelParam = getSlotLabelDisplay(slot.label);
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = new URL('/thanks', base);
  url.searchParams.set('slot', slotLabel);
  url.searchParams.set('label', labelParam);
  return NextResponse.redirect(url);
}
