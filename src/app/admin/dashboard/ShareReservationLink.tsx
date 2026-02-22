'use client';

import { useState, useEffect } from 'react';

export function ShareReservationLink({ stylistId }: { stylistId: string }) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const base = window.location.origin;
    setShareUrl(stylistId ? `${base}/stylist/${stylistId}` : `${base}/today`);
  }, [stylistId]);

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
        <h2 className="text-sm font-semibold text-stone-800">予約ページを共有</h2>
        <p className="text-xs text-stone-500 mt-0.5">お客様に送るリンクをコピーして共有できます</p>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 min-w-0 px-3 py-3 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-700"
            aria-label="予約ページのURL"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 px-5 py-3 rounded-xl font-medium text-sm bg-stone-900 text-white min-h-[48px] w-full sm:w-auto touch-manipulation active:scale-[0.98] transition-transform"
          >
            {copied ? 'コピーしました' : 'コピー'}
          </button>
        </div>
        <a
          href={stylistId ? `/stylist/${stylistId}` : '/today'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-stone-600 underline underline-offset-2 text-center"
        >
          予約ページを開く →
        </a>
      </div>
    </section>
  );
}
