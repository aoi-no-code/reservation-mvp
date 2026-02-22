import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  return NextResponse.redirect(new URL('/admin/login', base), { status: 302 });
}
