import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { getStylistsForAdmin } from '@/app/actions/admin';
import { toDateTimeLocalJst } from '@/lib/datetime';
import { SlotForm } from '../../SlotForm';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();

export default async function EditSlotPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAIL || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    redirect('/admin/login');
  }

  const admin = createAdminClient();
  const [slotResult, stylists] = await Promise.all([
    admin.from('slots').select('*').eq('id', id).single(),
    getStylistsForAdmin(),
  ]);
  const { data: slot, error } = slotResult;
  if (error || !slot) notFound();

  const defaultStartAt = toDateTimeLocalJst(slot.start_at);

  return (
    <div>
      <Link href="/admin" className="text-sm text-stone-600 hover:underline mb-4 inline-block">
        ← 一覧に戻る
      </Link>
      <h1 className="text-xl font-bold mb-6">枠を編集</h1>
      <SlotForm
        stylists={stylists}
        slotId={slot.id}
        defaultStartAt={defaultStartAt}
        defaultStylistId={slot.stylist_id}
        defaultLabel={slot.label}
        defaultNote={slot.note ?? ''}
        defaultIsActive={slot.is_active}
      />
    </div>
  );
}
