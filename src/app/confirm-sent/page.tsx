import Link from 'next/link';

export const metadata = {
  title: '確認メールを送りました',
  description: 'ご登録のメールアドレスに確認リンクを送信しました。',
};

export default function ConfirmSentPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col items-center justify-center px-4">
      <main className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold mb-4">確認メールを送りました</h1>
        <p className="text-stone-600 mb-6">
          ご登録のメールアドレスに確認用のリンクをお送りしました。<br />
          メール内のリンクをクリックすると予約が確定します。
        </p>
        <p className="text-sm text-stone-500 mb-8">
          メールが届かない場合は、迷惑メールフォルダをご確認ください。
        </p>
        <Link
          href="/today"
          className="inline-block py-4 px-8 rounded-xl font-bold text-white bg-stone-900"
        >
          枠一覧に戻る
        </Link>
      </main>
    </div>
  );
}
