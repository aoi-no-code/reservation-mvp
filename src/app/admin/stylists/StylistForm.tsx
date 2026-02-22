'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStylist } from '@/app/actions/admin';

type Props = {
  stylistId?: string;
  defaultName?: string;
  defaultInstagramId?: string;
  defaultAuthUserId?: string;
  defaultHourlyRate?: number | null;
  defaultEmail?: string;
  isEdit?: boolean;
};

export function StylistForm({
  defaultName = '',
  defaultInstagramId = '',
  defaultAuthUserId = '',
  defaultHourlyRate = null,
  defaultEmail = '',
  isEdit = false,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [instagramId, setInstagramId] = useState(defaultInstagramId);
  const [authUserId, setAuthUserId] = useState(defaultAuthUserId);
  const [hourlyRate, setHourlyRate] = useState(defaultHourlyRate ?? '');
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const rate = hourlyRate === '' || hourlyRate === null ? null : Number(hourlyRate);
    const result = await createStylist(
      name.trim(),
      instagramId.trim() || null,
      authUserId.trim() || null,
      rate,
      email.trim() || null
    );
    setSubmitting(false);
    if (result.ok) {
      router.push('/admin');
      return;
    }
    setError(result.error ?? '保存に失敗しました');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
          名前 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-stone-300"
          required
          disabled={submitting}
          placeholder="山田 太郎"
        />
      </div>
      <div>
        <label htmlFor="instagram_id" className="block text-sm font-medium text-stone-700 mb-1">
          インスタID（任意）
        </label>
        <input
          id="instagram_id"
          type="text"
          value={instagramId}
          onChange={(e) => setInstagramId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-stone-300"
          disabled={submitting}
          placeholder="@example"
        />
      </div>
      <div>
        <label htmlFor="auth_user_id" className="block text-sm font-medium text-stone-700 mb-1">
          Supabase Auth ユーザーID（任意）
        </label>
        <input
          id="auth_user_id"
          type="text"
          value={authUserId}
          onChange={(e) => setAuthUserId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-stone-300 font-mono text-sm"
          disabled={submitting}
          placeholder="uuid"
        />
      </div>
      <div>
        <label htmlFor="hourly_rate" className="block text-sm font-medium text-stone-700 mb-1">
          おおよそ1時間あたりの金額（円）（任意）
        </label>
        <input
          id="hourly_rate"
          type="number"
          min={0}
          value={hourlyRate === null || hourlyRate === '' ? '' : hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full px-4 py-3 rounded-xl border border-stone-300"
          disabled={submitting}
          placeholder="3000"
        />
        <p className="text-xs text-stone-500 mt-1">「約¥3,000/1h」のように表示に使います</p>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
          メールアドレス（任意）
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-stone-300"
          disabled={submitting}
          placeholder="stylist@example.com"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      <div className="pt-4">
        <button
          type="submit"
          className="w-full py-4 rounded-xl font-bold text-white bg-stone-900 disabled:bg-stone-400"
          disabled={submitting}
        >
          {isEdit ? '更新する' : '追加する'}
        </button>
      </div>
    </form>
  );
}
