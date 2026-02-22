'use client';

import Link from 'next/link';

type Slot = {
  id: string;
  start_at: string;
  label: string;
  note: string | null;
  is_active: boolean;
  stylist_name: string;
  reservationCount: number;
};

export function SlotList({
  slots,
  getLabelDisplay,
}: {
  slots: Slot[];
  getLabelDisplay: (label: string) => string;
}) {
  if (slots.length === 0) {
    return (
      <div className="rounded-xl bg-white border border-stone-200 p-8 text-center text-stone-500">
        まだ枠がありません。新規枠を追加してください。
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {slots.map((s) => {
        const start = new Date(s.start_at);
        const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        const isBooked = s.reservationCount > 0;
        return (
          <li
            key={s.id}
            className="flex items-center justify-between gap-4 rounded-xl bg-white border border-stone-200 p-4"
          >
            <div>
              <p className="font-medium">
                {dateStr} {timeStr} — {getLabelDisplay(s.label)}
              </p>
              <p className="text-sm text-stone-500">
                {s.stylist_name} · {isBooked ? '予約済' : '空き'}
                {s.note && ` · ${s.note}`}
              </p>
              {!s.is_active && (
                <span className="inline-block mt-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  非表示
                </span>
              )}
            </div>
            <Link
              href={`/admin/slots/${s.id}/edit`}
              className="py-2 px-4 rounded-lg border border-stone-300 text-sm font-medium hover:bg-stone-50"
            >
              編集
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
