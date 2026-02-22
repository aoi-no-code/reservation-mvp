import { createClient } from '@supabase/supabase-js';

/**
 * 管理画面用。サービスロールキーで RLS をバイパス。
 * サーバーサイド（Server Action / Route Handler）でのみ使用すること。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin env');
  return createClient(url, key, { auth: { persistSession: false } });
}
