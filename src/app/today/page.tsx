import { getPublicSlots } from '@/app/actions/reservation';
import { getSlotLabelDisplay } from '@/lib/labels';
import { TodaySlots } from './TodaySlots';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: '本日のご案内可能枠 | 予約',
  description: '本日ご案内可能な限定枠からご予約いただけます。',
  openGraph: {
    title: '本日のご案内可能枠',
    description: '限定枠からご予約をどうぞ。',
  },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const week = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${m}/${day} ${week}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getHourlyRateSummary(slots: { stylist_hourly_rate: number | null }[]): string | null {
  const rates = Array.from(new Set(slots.map((s) => s.stylist_hourly_rate).filter((r): r is number => r != null)));
  if (rates.length === 0) return null;
  const sorted = rates.sort((a, b) => a - b);
  if (sorted.length === 1) return `約¥${sorted[0].toLocaleString()}/1h`;
  return `約¥${sorted[0].toLocaleString()}〜${sorted[sorted.length - 1].toLocaleString()}/1h`;
}

export default async function TodayPage() {
  const slots = await getPublicSlots();
  const hourlySummary = getHourlyRateSummary(slots);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#faf9f7] text-stone-900 safe-area-padding">
      <main className="w-full max-w-[360px] mx-auto px-5 py-10 pb-28 flex flex-col items-center text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 mb-2">
          直近のご案内可能枠
        </h1>
        <p className="text-sm text-stone-500 mb-10 max-w-[280px]">
          限定枠のみご案内しています。ご希望の枠からお選びください。
        </p>

        {slots.length === 0 ? (
          <div className="w-full rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm p-10 text-center text-stone-600">
            <p className="font-medium">現在ご案内できる枠はありません。</p>
            <p className="text-sm mt-2 text-stone-500">別の日時をご希望の方は下記よりお問い合わせください。</p>
          </div>
        ) : (
          <TodaySlots
            slots={slots.map((s) => ({
              id: s.id,
              dateLabel: formatDate(s.start_at),
              timeLabel: formatTime(s.start_at),
              label: getSlotLabelDisplay(s.label),
              remaining: s.remaining,
              note: s.note,
              stylistName: s.stylist_name,
              stylistHourlyRate: s.stylist_hourly_rate,
            }))}
          />
        )}

        <section className="mt-12 w-full rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm p-5 text-center">
          <p className="text-sm text-stone-600 leading-relaxed">
            ここでは施術時間のみお取りできます。当日の金額はご相談ください。
          </p>
          <p className="mt-2 text-sm text-stone-600">
            {hourlySummary ? (
              <>おおよそ1時間メニューの金額は{hourlySummary}です。</>
            ) : (
              <>おおよそ1時間メニューの金額はご相談ください。</>
            )}
          </p>
        </section>

        <footer className="mt-14 text-center">
          <p className="text-xs text-stone-400">他の日時をご希望の方</p>
          {process.env.NEXT_PUBLIC_OTHER_INQUIRY_URL ? (
            <a
              href={process.env.NEXT_PUBLIC_OTHER_INQUIRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1.5 text-sm font-medium text-stone-700 underline underline-offset-2 decoration-stone-300 hover:decoration-stone-500 transition-colors"
            >
              DM でご相談
            </a>
          ) : (
            <span className="inline-block mt-1.5 text-xs text-stone-400">（リンクは管理者が設定できます）</span>
          )}
        </footer>
      </main>
    </div>
  );
}
