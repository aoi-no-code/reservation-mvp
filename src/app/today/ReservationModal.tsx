'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createReservation } from '@/app/actions/reservation';

type SlotDisplay = {
  id: string;
  dateLabel: string;
  timeLabel: string;
  label: string;
  remaining: number;
  note: string | null;
};

export function ReservationModal({
  slot,
  onClose,
  onSuccess,
}: {
  slot: SlotDisplay;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagramId, setInstagramId] = useState('');
  const [menuNote, setMenuNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('お名前を入力してください。');
      return;
    }
    if (!phone.trim()) {
      setError('電話番号を入力してください。');
      return;
    }
    if (!email.trim()) {
      setError('確認メールを送るため、メールアドレスを入力してください。');
      return;
    }
    setError(null);
    setSubmitting(true);
    const slotLabelForEmail = `${slot.dateLabel} ${slot.timeLabel}（${slot.label}）`;
    const result = await createReservation(
      slot.id,
      name.trim(),
      phone.trim(),
      email.trim() || null,
      instagramId.trim() || null,
      menuNote.trim() || null,
      slotLabelForEmail
    );
    setSubmitting(false);
    if (result.ok) {
      onSuccess();
      router.push('/confirm-sent');
      return;
    }
    setError(result.message ?? '予約に失敗しました。もう一度お試しください。');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
          <h2 id="modal-title" className="font-bold text-stone-900">
            予約フォーム
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -m-2 text-stone-500 hover:text-stone-800"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-stone-600 mb-4">
            {slot.dateLabel} {slot.timeLabel}（{slot.label}）
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="山田 花子"
                autoComplete="name"
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-1">
                電話番号 <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="090-1234-5678"
                autoComplete="tel"
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-stone-500 mb-1">確認用のリンクをお送りします</p>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="example@email.com"
                autoComplete="email"
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="instagram_id" className="block text-sm font-medium text-stone-700 mb-1">
                インスタのID（任意）
              </label>
              <input
                id="instagram_id"
                type="text"
                value={instagramId}
                onChange={(e) => setInstagramId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="@example"
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="menu_note" className="block text-sm font-medium text-stone-700 mb-1">
                メニュー（任意）
              </label>
              <textarea
                id="menu_note"
                value={menuNote}
                onChange={(e) => setMenuNote(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[80px]"
                placeholder="カット、カラー など希望メニューを簡単に"
                disabled={submitting}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-xl font-medium border border-stone-300 text-stone-700"
                disabled={submitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 py-4 rounded-xl font-bold text-white bg-stone-900 disabled:bg-stone-400 min-h-[48px]"
                disabled={submitting}
              >
                {submitting ? '送信中…' : '送信して確認メールを受け取る'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
