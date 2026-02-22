import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/**
 * DB接続確認用（開発・デバッグ用）。
 * GET /api/db-check で Supabase への接続とテーブル参照を確認します。
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1. シンプルなクエリで接続確認（stylists は必ず存在するテーブル）
    const { data: stylists, error: e1 } = await supabase
      .from('stylists')
      .select('id')
      .limit(1);

    if (e1) {
      return NextResponse.json(
        { ok: false, message: 'DB接続エラー（stylists）', error: e1.message, code: e1.code },
        { status: 503 }
      );
    }

    // 2. RPC が使えるか確認（get_public_slots は公開用なので anon でも呼べる想定だが、admin で確実に）
    const { data: slots, error: e2 } = await supabase.rpc('get_public_slots');
    if (e2) {
      return NextResponse.json(
        { ok: false, message: 'RPC get_public_slots エラー', error: e2.message, code: e2.code },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'DB連携OK',
      details: {
        stylists_count: Array.isArray(stylists) ? stylists.length : 0,
        public_slots_count: Array.isArray(slots) ? slots.length : 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, message: '接続エラー', error: message },
      { status: 503 }
    );
  }
}
