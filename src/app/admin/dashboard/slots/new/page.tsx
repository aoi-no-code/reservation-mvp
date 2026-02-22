import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentStylist } from '@/app/actions/admin';
import { getTodayString, getTomorrowString } from '@/lib/timeOptions';
import { StylistSlotForm } from '../StylistSlotForm';

export default async function NewSlotPage({
  searchParams,
}: {
  searchParams: { date?: string | string[] };
}) {
  const stylist = await getCurrentStylist();
  if (!stylist) {
    redirect('/admin');
  }

  const preset = typeof searchParams.date === 'string' ? searchParams.date : undefined;
  const defaultDate =
    preset === 'today' ? getTodayString() : preset === 'tomorrow' ? getTomorrowString() : '';

  return (
    <div>
      <Link
        href="/admin/dashboard"
        className="text-sm text-stone-600 hover:underline mb-4 inline-block"
      >
        ← マイページに戻る
      </Link>
      <h1 className="text-xl font-bold mb-2">枠を追加</h1>
      <p className="text-sm text-stone-600 mb-6">
        ご自身の予約可能枠を1件追加します。追加した枠は、表示する場合はお客様の予約ページに最大3件まで表示されます。
      </p>
      <StylistSlotForm defaultDate={defaultDate} />
    </div>
  );
}
