const TOKYO_TIMEZONE = 'Asia/Tokyo';

function getDatePartsInTokyo(dateStr: string): {
  year: string;
  month: string;
  day: string;
  weekday: string;
  hour: string;
  minute: string;
} {
  const date = new Date(dateStr);
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: TOKYO_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: byType.year ?? '0000',
    month: byType.month ?? '1',
    day: byType.day ?? '1',
    weekday: byType.weekday ?? '',
    hour: byType.hour ?? '00',
    minute: byType.minute ?? '00',
  };
}

export function formatDateJst(dateStr: string): string {
  const { month, day, weekday } = getDatePartsInTokyo(dateStr);
  return `${month}/${day} ${weekday}`;
}

export function formatTimeJst(dateStr: string): string {
  const { hour, minute } = getDatePartsInTokyo(dateStr);
  return `${hour}:${minute}`;
}

export function formatMonthDayTimeJst(dateStr: string): string {
  const { month, day, hour, minute } = getDatePartsInTokyo(dateStr);
  return `${month}/${day} ${hour}:${minute}`;
}

export function toDateTimeLocalJst(dateStr: string): string {
  const { year, month, day, hour, minute } = getDatePartsInTokyo(dateStr);
  const normalizedMonth = month.padStart(2, '0');
  const normalizedDay = day.padStart(2, '0');
  return `${year}-${normalizedMonth}-${normalizedDay}T${hour}:${minute}`;
}
