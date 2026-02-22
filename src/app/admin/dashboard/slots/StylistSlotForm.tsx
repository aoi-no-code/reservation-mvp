'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSlotAsStylist } from '@/app/actions/admin';
import { getTodayString, getTomorrowString, TIME_OPTIONS_30MIN, toISOString } from '@/lib/timeOptions';

const LABEL_OPTIONS = [
  { value: 'shortest', label: '最短' },
  { value: 'popular', label: '人気' },
  { value: 'afterwork', label: '仕事終わり' },
];

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

type StylistSlotFormProps = {
  /** サーバーで設定した初期日付（?date=today / tomorrow 用） */
  defaultDate?: string;
};

export function StylistSlotForm({ defaultDate = '' }: StylistSlotFormProps) {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [label, setLabel] = useState('shortest');
  const [note, setNote] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // URLで渡された初期日付をネイティブ input にも反映（JS読み込み遅延対策）
  useEffect(() => {
    if (date && dateInputRef.current) {
      dateInputRef.current.value = date;
    }
  }, [date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const iso = toISOString(date, time);
    const result = await createSlotAsStylist(iso, label, note || null, isActive);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? '追加に失敗しました');
      return;
    }
    router.push('/admin/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          表示する（お客様の予約ページに出す）
        </label>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 py-4 rounded-xl font-bold text-white bg-stone-900 disabled:bg-stone-400"
          disabled={submitting}
        >
          {submitting ? '追加中…' : '枠を追加する'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/dashboard')}
          className="py-4 px-6 rounded-xl font-medium border border-stone-300 text-stone-700 hover:bg-stone-50"
          disabled={submitting}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
