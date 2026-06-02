import { prisma } from '../lib/prisma';

// Called by a cron job (or setInterval at boot) every minute
export async function processMissedCheckins() {
  const now = new Date();

  const overdue = await prisma.safetyCheckin.findMany({
    where: {
      scheduledAt: { lte: now },
      confirmedAt: null,
      alertSent: false,
    },
    include: {
      user: { include: { emergencyContacts: true } },
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

async function sendEmergencyAlerts(checkin: any) {
  const { user } = checkin;
  for (const contact of user.emergencyContacts) {
    // Email fallback (Nodemailer) — SMS (Twilio) can be added later
    console.log(
      `[Safety Alert] ${user.name} missed her check-in. Contact: ${contact.name} <${contact.phone}>`,
    );
    // await emailService.sendSafetyAlert(contact, user);
  }
}
