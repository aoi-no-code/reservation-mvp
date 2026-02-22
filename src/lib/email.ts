import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';

/**
 * お客様へ「予約確認メール」を送信（リンクを踏ぶと予約確定）
 */
export async function sendConfirmEmailToCustomer(
  to: string,
  confirmUrl: string,
  slotLabel: string
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.error('RESEND_API_KEY is not set');
    return { ok: false, error: 'メール送信の設定がありません' };
  }
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: '【予約確認】ご予約を確定してください',
    html: `
      <p>このたびはご予約いただきありがとうございます。</p>
      <p>下記のリンクをクリックすると予約が確定します。</p>
      <p><strong>ご予約枠：${escapeHtml(slotLabel)}</strong></p>
      <p><a href="${escapeHtml(confirmUrl)}" style="display:inline-block; margin:1em 0; padding:12px 24px; background:#1c1917; color:#fff; text-decoration:none; border-radius:8px;">予約を確定する</a></p>
      <p>${escapeHtml(confirmUrl)}</p>
      <p>※このメールに心当たりのない場合は破棄してください。</p>
    `,
  });
  if (error) {
    console.error('Resend sendConfirmEmailToCustomer error', JSON.stringify(error, null, 2));
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * 美容師へ「予約が確定しました」メールを送信
 */
export async function sendConfirmedEmailToStylist(
  stylistEmail: string,
  customerName: string,
  slotLabel: string,
  slotDateTime: string,
  phone: string,
  menuNote: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.error('RESEND_API_KEY is not set');
    return { ok: false, error: 'メール送信の設定がありません' };
  }
  const { error } = await resend.emails.send({
    from,
    to: [stylistEmail],
    subject: '【予約確定】新しいご予約が入りました',
    html: `
      <p>予約が確定しました。</p>
      <ul>
        <li><strong>お客様名：</strong>${escapeHtml(customerName)}</li>
        <li><strong>枠：</strong>${escapeHtml(slotLabel)}（${escapeHtml(slotDateTime)}）</li>
        <li><strong>電話番号：</strong>${escapeHtml(phone)}</li>
        ${menuNote ? `<li><strong>メニュー・備考：</strong>${escapeHtml(menuNote)}</li>` : ''}
      </ul>
    `,
  });
  if (error) {
    console.error('Resend sendConfirmedEmailToStylist error', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
