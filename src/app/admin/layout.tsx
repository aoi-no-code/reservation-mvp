import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = ADMIN_EMAIL && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      {user && (
        <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
          <Link
            href={isAdmin ? '/admin' : '/admin/dashboard'}
            className="font-bold text-stone-900"
          >
            {isAdmin ? '管理画面' : 'マイページ'}
          </Link>
          <form action="/admin/logout" method="post">
            <button
              type="submit"
              className="text-sm text-stone-600 hover:text-stone-900"
            >
              ログアウト
            </button>
          </form>
        </header>
      )}
      <main className="max-w-4xl mx-auto px-3 py-3 sm:px-4 sm:py-6">{children}</main>
    </div>
  );
}
