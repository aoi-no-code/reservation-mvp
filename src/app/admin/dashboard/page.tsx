import { redirect } from 'next/navigation';
import { getCurrentStylist, getStylistSlotsWithReservations } from '@/app/actions/admin';
import { DashboardSlots } from './DashboardSlots';
import { ShareReservationLink } from './ShareReservationLink';

export default async function StylistDashboardPage() {
  const stylist = await getCurrentStylist();
  if (!stylist) {
    redirect('/admin');
  }

  const { slots, reservationsBySlotId } = await getStylistSlotsWithReservations(stylist.id);
  const displaySlots = slots.slice(0, 2);

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] pb-6">
      <h1 className="text-xl font-bold text-stone-900 mb-4 px-1">{stylist.name} さん</h1>

      <div className="shrink-0 mb-6">
        <ShareReservationLink />
      </div>

      <section className="flex-1 min-h-0 flex flex-col">
        <h2 className="text-sm font-semibold text-stone-700 mb-3 px-1">枠の管理</h2>
        <DashboardSlots slots={displaySlots} reservationsBySlotId={reservationsBySlotId} />
      </section>
    </div>
  );
}
