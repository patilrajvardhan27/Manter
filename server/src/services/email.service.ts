import nodemailer from 'nodemailer';

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? '587', 10),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const FROM = `"Manter" <${process.env.SMTP_USER ?? 'noreply@manter.app'}>`;

async function send(to: string, subject: string, html: string) {
  const transport = createTransport();
  if (!transport) {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Email] SMTP not configured — would send to ${to}: ${subject}`);
    }
    return;
  }
  try {
    await transport.sendMail({ from: FROM, to, subject, html });
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
  }
}

function wrap(content: string) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#fff">
      <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:28px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px">Manter</h1>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Safety-first dating</p>
      </div>
      <div style="padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px">
        ${content}
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:11px;margin:16px 0 32px">
        You received this because you have a Manter account.
      </p>
    </div>
  `;
}

export async function sendWelcome(to: string, name: string) {
  await send(
    to,
    'Welcome to Manter 🎉',
    wrap(`
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:8px">
        Hi ${name}, welcome aboard!
      </h2>
      <p style="color:#374151;line-height:1.6">
        Manter is the first dating app built on character — not just photos.
        Complete your profile to start getting matched with people who share your values.
      </p>
      <a href="${process.env.APP_DEEP_LINK ?? '#'}"
         style="display:inline-block;margin-top:20px;background:#7c3aed;color:#fff;
                padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">
        Open Manter
      </a>
    `),
  );
}

export async function sendNewMatchEmail(to: string, userName: string, matchName: string) {
  await send(
    to,
    `💜 You matched with ${matchName}!`,
    wrap(`
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:8px">
        Hi ${userName} — you have a new match!
      </h2>
      <p style="color:#374151;line-height:1.6">
        You and <strong>${matchName}</strong> liked each other. Open Manter to say hello.
      </p>
      <a href="${process.env.APP_DEEP_LINK ?? '#'}"
         style="display:inline-block;margin-top:20px;background:#7c3aed;color:#fff;
                padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">
        Start a conversation
      </a>
    `),
  );
}

export async function sendSafetyAlertEmail(
  to: string,
  contactName: string,
  userName: string,
  scheduledTime: string,
) {
  await send(
    to,
    `⚠️ SAFETY ALERT: ${userName} missed her date check-in`,
    wrap(`
      <p>Hi <strong>${contactName}</strong>,</p>
      <p style="color:#374151;line-height:1.6">
        <strong>${userName}</strong> set a safety check-in on Manter for
        <strong>${scheduledTime}</strong> and has not confirmed she is safe.
      </p>
      <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
                  padding:16px;margin:20px 0">
        <strong style="color:#b91c1c">Please check in with ${userName} immediately.</strong>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6">
        If you are unable to reach her, consider contacting local authorities.
        This alert was triggered automatically because you are listed as one of
        her emergency contacts.
      </p>
    `),
  );
}
