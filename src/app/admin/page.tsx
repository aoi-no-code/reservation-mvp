import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getCurrentStylist, getSlotsForAdmin, getReservationCountsBySlot, getStylistsForAdmin } from '@/app/actions/admin';
import { getSlotLabelDisplay } from '@/lib/labels';
import { SlotList } from './SlotList';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }
  const isAdmin = ADMIN_EMAIL && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (!isAdmin) {
    const stylist = await getCurrentStylist();
    if (stylist) {
      redirect('/admin/dashboard');
    }
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
        <p className="text-amber-800">このアカウントでは管理画面にアクセスできません。</p>
        <form action="/admin/logout" method="post" className="mt-4">
          <button type="submit" className="text-sm text-amber-700 underline">
            ログアウト
          </button>
        </form>
      </div>
    );
  }

  const [slots, counts, stylists] = await Promise.all([
    getSlotsForAdmin(),
    getReservationCountsBySlot(),
    getStylistsForAdmin(),
  ]);

  const stylistMap = Object.fromEntries(stylists.map((st) => [st.id, st.name]));

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">表示する3枠の管理</h1>
      <p className="text-sm text-stone-600 mb-6">
        ここで登録した枠のうち、<strong>is_active が ON</strong> で
        <strong>未来の時刻</strong>のものから最大3件がトップ（/）に表示されます。
      </p>
      <div className="mb-6 flex gap-3">
        <Link
          href="/admin/stylists/new"
          className="inline-block py-3 px-5 rounded-xl font-medium border border-stone-300 text-stone-700 hover:bg-stone-50"
        >
          美容師を追加
        </Link>
        <Link
          href="/admin/slots/new"
          className="inline-block py-3 px-5 rounded-xl font-medium bg-stone-900 text-white"
        >
          新規枠を追加
        </Link>
      </div>
      <SlotList
        slots={slots.map((s) => ({
          id: s.id,
          start_at: s.start_at,
          label: s.label,
          note: s.note,
          is_active: s.is_active,
          stylist_name: stylistMap[s.stylist_id] ?? '—',
          reservationCount: counts[s.id] ?? 0,
        }))}
        getLabelDisplay={getSlotLabelDisplay}
      />
    </div>
  );
}
