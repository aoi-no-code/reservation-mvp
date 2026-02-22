import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getStylistsForAdmin } from '@/app/actions/admin';
import { SlotForm } from '../SlotForm';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();

export default async function NewSlotPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAIL || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    redirect('/admin/login');
  }

  const stylists = await getStylistsForAdmin();

  return (
    <div>
      <Link href="/admin" className="text-sm text-stone-600 hover:underline mb-4 inline-block">
        ← 一覧に戻る
      </Link>
      <h1 className="text-xl font-bold mb-6">新規枠を追加</h1>
      <SlotForm stylists={stylists} />
    </div>
  );
}
