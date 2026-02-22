'use client';

import { useState } from 'react';
import { ReservationModal } from './ReservationModal';

type SlotDisplay = {
  id: string;
  dateLabel: string;
  timeLabel: string;
  label: string;
  remaining: number;
  note: string | null;
  stylistName?: string;
  stylistHourlyRate?: number | null;
};

export function TodaySlots({
  slots,
  hideStylistName,
}: {
  slots: SlotDisplay[];
  hideStylistName?: boolean;
}) {
  const [selectedSlot, setSelectedSlot] = useState<SlotDisplay | null>(null);
  const stylistName = !hideStylistName && slots.length > 0 ? slots[0].stylistName : undefined;

  return (
    <>
      {stylistName && (
        <p className="text-sm font-medium text-stone-600 w-full text-center mb-1.5">
          {stylistName}
        </p>
      )}
      <ul className="w-full space-y-3 flex flex-col items-center">
        {slots.map((slot) => {
          const canReserve = slot.remaining > 0;
          return (
            <li key={slot.id} className="w-full">
              <div className="w-full rounded-2xl bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
                <div className="p-5 text-center">
                  <span className="text-xs font-medium text-stone-400 tracking-wide">{slot.dateLabel}</span>
                  <span className="block text-4xl font-bold text-stone-900 mt-1 tracking-tight">
                    {slot.timeLabel}〜
                  </span>
                  <span className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
                    {slot.label}
                  </span>
                  {slot.note && (
                    <p className="text-xs text-stone-500 mt-1.5">{slot.note}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => canReserve && setSelectedSlot(slot)}
                    disabled={!canReserve}
                    className="mt-5 w-full py-4 rounded-xl font-semibold text-white bg-stone-900 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed touch-manipulation min-h-[52px] active:scale-[0.98] transition-transform"
                  >
                    {canReserve ? 'この枠で予約する' : '満枠'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {selectedSlot && (
        <ReservationModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSuccess={() => setSelectedSlot(null)}
        />
      )}
    </>
  );
}
