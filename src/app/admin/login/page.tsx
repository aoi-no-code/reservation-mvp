import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/admin');
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-bold mb-6">管理画面ログイン</h1>
      <LoginForm />
    </div>
  );
}
