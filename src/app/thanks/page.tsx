export const metadata = {
  title: 'ご予約ありがとうございます',
  description: 'ご予約を承りました。',
};

type SearchParams = { slot?: string; label?: string };

export default function ThanksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const slot = typeof searchParams?.slot === 'string' ? searchParams.slot : '';
  const label = typeof searchParams?.label === 'string' ? searchParams.label : '';

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col items-center justify-center px-4">
      <main className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold mb-4">ご予約ありがとうございます</h1>
        <p className="text-stone-600 mb-6">
          ご予約を承りました。内容をご確認のうえ、ご来店お待ちしております。
        </p>
        {(slot || label) && (
          <div className="rounded-2xl bg-white border border-stone-200 p-6 mb-8 text-left">
            <p className="text-sm text-stone-500">ご予約枠</p>
            <p className="font-medium mt-1">
              {slot}
              {label && `（${label}）`}
            </p>
          </div>
        )}
        <p className="text-sm text-stone-500">この画面は閉じていただいて問題ありません。</p>
      </main>
    </div>
  );
}
