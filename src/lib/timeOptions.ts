/** 30分刻みの時刻選択肢（00:00 ～ 23:30） */
export const TIME_OPTIONS_30MIN: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30] as const) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const label = `${h}:${m === 0 ? '00' : '30'}`;
      options.push({ value, label });
    }
  }
  return options;
})();

/** ISO日時文字列を「日付」と「30分刻みの時刻」に分解（初期値用） */
export function parseDateTimeToDateAndTime(iso: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '09:00' };
  const d = new Date(iso);
  const date =
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0');
  const totalMins = d.getHours() * 60 + d.getMinutes();
  const rounded = Math.round(totalMins / 30) * 30;
  const h = Math.floor(rounded / 60) % 24;
  const m = rounded % 60;
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { date, time };
}

/** 日付（YYYY-MM-DD）と時刻（HH:mm）を結合してISO文字列を返す（ローカル時刻として解釈） */
export function toISOString(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

/** 今日の日付を YYYY-MM-DD で返す（ローカル） */
export function getTodayString(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/** 明日の日付を YYYY-MM-DD で返す（ローカル） */
export function getTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}
