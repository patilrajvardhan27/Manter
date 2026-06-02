import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';

// ─── Email transport ──────────────────────────────────────────────────────────

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

// ─── Check-in processor (runs every 60 seconds) ───────────────────────────────

export function startCheckinProcessor(): NodeJS.Timeout {
  return setInterval(processMissedCheckins, 60_000);
}

export async function processMissedCheckins() {
  const now = new Date();

  const overdue = await prisma.safetyCheckin.findMany({
    where: {
      scheduledAt: { lte: now },
      confirmedAt: null,
      alertSent: false,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          emergencyContacts: true,
        },
      },
    },
  });

  for (const checkin of overdue) {
    await sendEmergencyAlerts(checkin);
    await prisma.safetyCheckin.update({
      where: { id: checkin.id },
      data: { alertSent: true },
    });
  }
}

// ─── Alert dispatch ───────────────────────────────────────────────────────────

async function sendEmergencyAlerts(checkin: {
  scheduledAt: Date;
  user: {
    name: string;
    email: string;
    emergencyContacts: { name: string; phone: string; relation: string }[];
  };
}) {
  const { user, scheduledAt } = checkin;
  const transport = createTransport();
  const timeStr = scheduledAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  for (const contact of user.emergencyContacts) {
    const subject = `⚠️ SAFETY ALERT: ${user.name} missed her date check-in`;
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#7c3aed;padding:20px 24px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0">🛡 Manter Safety Alert</h2>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
          <p>Hi <strong>${contact.name}</strong>,</p>
          <p>
            <strong>${user.name}</strong> set a safety check-in on Manter for <strong>${timeStr}</strong>
            and has not confirmed she is safe.
          </p>
          <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:20px 0">
            <strong style="color:#b91c1c">Please check in with ${user.name} immediately.</strong>
          </div>
          <p style="color:#6b7280;font-size:14px">
            This alert was sent because you are listed as one of ${user.name}'s emergency contacts on Manter.
            If you are unable to reach her, consider contacting local authorities.
          </p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:20px 0"/>
          <p style="color:#9ca3af;font-size:12px">
            Manter — Safety-first dating. This is an automated safety alert.
          </p>
        </div>
      </div>
    `;

    if (transport) {
      await transport.sendMail({
        from: `"Manter Safety" <${process.env.SMTP_USER}>`,
        to: contact.phone.includes('@') ? contact.phone : undefined, // only if email-format phone
        subject,
        html,
      }).catch((err) => {
        console.error(`[Safety] Email failed to ${contact.name}:`, err.message);
      });
    }

    // Always log for visibility regardless of email config
    console.warn(
      `[Safety Alert] ${user.name} missed check-in at ${timeStr}. ` +
      `Contact: ${contact.name} (${contact.relation}) — ${contact.phone}`,
    );
  }
}
