'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSlot, updateSlot, deleteSlot } from '@/app/actions/admin';
import {
  getTodayString,
  getTomorrowString,
  parseDateTimeToDateAndTime,
  TIME_OPTIONS_30MIN,
  toISOString,
} from '@/lib/timeOptions';
import type { Stylist } from '@/types/db';

function setDateAndInput(
  newDate: string,
  setDate: (d: string) => void,
  inputRef: React.RefObject<HTMLInputElement | null>
) {
  setDate(newDate);
  const el = inputRef.current;
  if (el) {
    el.value = newDate;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

const LABEL_OPTIONS = [
  { value: 'shortest', label: '最短' },
  { value: 'popular', label: '人気' },
  { value: 'afterwork', label: '仕事終わり' },
];

type Props = {
  stylists: Stylist[];
  slotId?: string;
  defaultStartAt?: string;
  defaultStylistId?: string;
  defaultLabel?: string;
  defaultNote?: string;
  defaultIsActive?: boolean;
};

export function SlotForm({
  stylists,
  slotId,
  defaultStartAt = '',
  defaultStylistId = '',
  defaultLabel = 'shortest',
  defaultNote = '',
  defaultIsActive = true,
}: Props) {
  const { date: defaultDate, time: defaultTime } = parseDateTimeToDateAndTime(defaultStartAt);
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [stylistId, setStylistId] = useState(defaultStylistId);
  const [label, setLabel] = useState(defaultLabel);
  const [note, setNote] = useState(defaultNote);
  const [isActive, setIsActive] = useState(defaultIsActive);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const iso = toISOString(date, time);
    if (slotId) {
      const result = await updateSlot(slotId, stylistId, iso, label, note || null, isActive);
      if (!result.ok) setError(result.error ?? '更新に失敗しました');
      else router.push('/admin');
    } else {
      const result = await createSlot(stylistId, iso, label, note || null, isActive);
      if (!result.ok) setError(result.error ?? '追加に失敗しました');
      else router.push('/admin');
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!slotId || !confirm('この枠を削除しますか？予約データも削除されます。')) return;
    setDeleting(true);
    const result = await deleteSlot(slotId);
    setDeleting(false);
    if (result.ok) router.push('/admin');
    else setError(result.error ?? '削除に失敗しました');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="stylist_id" className="block text-sm font-medium text-stone-700 mb-1">
          担当美容師 <span className="text-red-500">*</span>
        </label>
        <select
          id="stylist_id"
          value={stylistId}
          onChange={(e) => setStylistId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-stone-300"
          required
          disabled={submitting}
        >
          <option value="">選択してください</option>
          {stylists.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.hourly_rate != null ? `（約¥${s.hourly_rate.toLocaleString()}/1h）` : ''}
            </option>
          ))}
        </select>
        {stylists.length === 0 && (
          <p className="text-sm text-amber-700 mt-1">先に美容師を登録してください。</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="slot_date" className="block text-sm font-medium text-stone-700 mb-1">
            日付 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setDateAndInput(getTodayString(), setDate, dateInputRef)}
              className="flex-1 py-2.5 rounded-lg border border-stone-300 text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 disabled:opacity-50"
              disabled={submitting}
            >
              今日
            </button>
            <button
              type="button"
              onClick={() => setDateAndInput(getTomorrowString(), setDate, dateInputRef)}
              className="flex-1 py-2.5 rounded-lg border border-stone-300 text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 disabled:opacity-50"
              disabled={submitting}
            >
              明日
            </button>
          </div>
          <input
            ref={dateInputRef}
            id="slot_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-300"
            required
            disabled={submitting}
          />
        </div>
        <div>
          <label htmlFor="slot_time" className="block text-sm font-medium text-stone-700 mb-1">
            時刻（30分刻み） <span className="text-red-500">*</span>
          </label>
          <select
            id="slot_time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-300"
            required
            disabled={submitting}
          >
            {TIME_OPTIONS_30MIN.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="label" className="block text-sm font-medium text-stone-700 mb-1">
          ラベル
        </label>
        <select
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-stone-300"
          disabled={submitting}
        >
          {LABEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="note" className="block text-sm font-medium text-stone-700 mb-1">
          メモ（任意・例：キャンセル枠）
        </label>
        <input
          id="note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-stone-300"
          placeholder="キャンセルにより調整できた枠"
          disabled={submitting}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="is_active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-stone-300"
          disabled={submitting}
        />
        <label htmlFor="is_active" className="text-sm font-medium text-stone-700">
          表示する（is_active）
        </label>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 py-4 rounded-xl font-bold text-white bg-stone-900 disabled:bg-stone-400"
          disabled={submitting || stylists.length === 0}
        >
          {slotId ? '更新する' : '追加する'}
        </button>
        {slotId && (
          <button
            type="button"
            onClick={handleDelete}
            className="py-4 px-6 rounded-xl font-medium border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
            disabled={submitting || deleting}
          >
            削除
          </button>
        )}
      </div>
    </form>
  );
}
