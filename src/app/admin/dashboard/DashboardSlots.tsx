'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSlotAsStylist,
  updateSlotAsStylist,
  deleteSlotAsStylist,
} from '@/app/actions/admin';
import {
  getTodayString,
  getTomorrowString,
  parseDateTimeToDateAndTime,
  TIME_OPTIONS_30MIN,
  toISOString,
} from '@/lib/timeOptions';
import type { Reservation, Slot } from '@/types/db';

const LABEL_OPTIONS = [
  { value: 'shortest', label: '最短' },
  { value: 'popular', label: '人気' },
  { value: 'afterwork', label: '仕事終わり' },
];

type SlotCardProps = {
  slot: Slot | null;
  reservation: Reservation | null;
  index: number;
};

function SlotCard({ slot, reservation, index }: SlotCardProps) {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const isNew = !slot;
  const hasSlot = !isNew;
  const { date: initDate, time: initTime } = slot
    ? parseDateTimeToDateAndTime(slot.start_at)
    : { date: '', time: '09:00' };

  const [date, setDate] = useState(initDate);
  const [time, setTime] = useState(initTime);
  const [label, setLabel] = useState(slot?.label ?? 'shortest');
  const [note, setNote] = useState(slot?.note ?? '');
  const [isActive, setIsActive] = useState(slot?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const statusText = !slot
    ? '空き'
    : reservation
      ? '予約あり'
      : isActive
        ? '募集中'
        : '非公開';
  const slotSummary = slot ? `${date} ${time} / ${label}` : null;

  function reloadPage() {
    if (typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const iso = toISOString(date, time);
    if (isNew) {
      const result = await createSlotAsStylist(iso, label, note || null, isActive);
      setSubmitting(false);
      if (!result.ok) setError(result.error ?? '追加に失敗しました');
      else reloadPage();
      return;
    }
    const result = await updateSlotAsStylist(slot!.id, iso, label, note || null, isActive);
    setSubmitting(false);
    if (!result.ok) setError(result.error ?? '更新に失敗しました');
    else reloadPage();
  }

  async function handleDelete() {
    if (!slot || !confirm('削除しますか？')) return;
    setDeleting(true);
    const result = await deleteSlotAsStylist(slot.id);
    setDeleting(false);
    if (result.ok) reloadPage();
    else setError(result.error ?? '削除に失敗しました');
  }

  return (
    <div
      className={`flex flex-col flex-1 min-h-0 rounded-2xl border-2 overflow-hidden touch-manipulation ${
        hasSlot
          ? 'bg-white border-emerald-300 shadow-sm'
          : 'bg-stone-100 border-dashed border-stone-300'
      }`}
    >
      <div
        className={`px-3 py-2 shrink-0 text-sm font-medium ${
          hasSlot ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
        }`}
      >
        枠{index} ・{statusText}
      </div>
      {slotSummary && (
        <div className="px-3 py-2 text-xs text-stone-600 bg-stone-50 border-b border-stone-200 truncate">
          {slotSummary}
          {note ? ` / ${note}` : ''}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col flex-1 min-h-0 p-3 gap-3 overflow-auto"
      >
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setDate(getTodayString())}
            className="shrink-0 px-3 py-3 rounded-xl text-sm border border-stone-300 bg-white min-h-[48px]"
          >
            今日
          </button>
          <button
            type="button"
            onClick={() => setDate(getTomorrowString())}
            className="shrink-0 px-3 py-3 rounded-xl text-sm border border-stone-300 bg-white min-h-[48px]"
          >
            明日
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-3 rounded-xl border border-stone-300 text-sm min-h-[48px]"
            required
            disabled={submitting || deleting}
          />
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-20 shrink-0 px-3 py-3 rounded-xl border border-stone-300 text-sm min-h-[48px]"
            disabled={submitting || deleting}
          >
            {TIME_OPTIONS_30MIN.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={label}
            onChange={(e) =>
              setLabel(
                e.target.value as 'shortest' | 'popular' | 'afterwork'
              )
            }
            className="w-28 shrink-0 px-3 py-3 rounded-xl border border-stone-300 text-sm min-h-[48px]"
            disabled={submitting || deleting}
          >
            {LABEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 min-w-[100px] px-3 py-3 rounded-xl border border-stone-300 text-sm min-h-[48px]"
            placeholder="メモ"
            disabled={submitting || deleting}
          />
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <label className="flex items-center gap-2 text-sm min-h-[48px] items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-stone-300 w-4 h-4"
              disabled={submitting || deleting}
            />
            表示
          </label>
          {reservation && (
            <span className="text-sm text-emerald-700 truncate" title={reservation.name}>
              予約: {reservation.name}
            </span>
          )}
        </div>
        {error && <p className="text-sm text-red-600 shrink-0">{error}</p>}
        <div className="flex gap-2 shrink-0 pt-1">
          <button
            type="submit"
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-stone-800 text-white disabled:bg-stone-400 min-h-[48px] active:scale-[0.98] transition-transform"
            disabled={submitting || deleting}
          >
            {isNew ? '追加' : '保存'}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="py-3 px-4 rounded-xl text-sm border border-red-300 text-red-700 min-h-[48px] active:scale-[0.98] transition-transform"
              disabled={submitting || deleting}
            >
              削除
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

type DashboardSlotsProps = {
  slots: Slot[];
  reservationsBySlotId: Record<string, Reservation>;
};

export function DashboardSlots({ slots, reservationsBySlotId }: DashboardSlotsProps) {
  const slot1 = slots[0] ?? null;
  const slot2 = slots[1] ?? null;
  const res1 = slot1 ? reservationsBySlotId[slot1.id] ?? null : null;
  const res2 = slot2 ? reservationsBySlotId[slot2.id] ?? null : null;

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-auto">
      <SlotCard slot={slot1} reservation={res1} index={1} />
      <SlotCard slot={slot2} reservation={res2} index={2} />
      <SlotCard slot={null} reservation={null} index={3} />
    </div>
  );
}
