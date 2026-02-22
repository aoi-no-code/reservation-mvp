import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { StylistForm } from '../StylistForm';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();

export default async function NewStylistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAIL || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    redirect('/admin/login');
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-stone-600 hover:underline mb-4 inline-block">
        ← 一覧に戻る
      </Link>
      <h1 className="text-xl font-bold mb-6">美容師を追加</h1>
      <StylistForm />
    </div>
  );
}
