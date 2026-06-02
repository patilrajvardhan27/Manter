import { redis } from '../lib/redis';

const EXPO_PUSH_URL = 'https://exp.host/push/send';
const TOKEN_TTL = 60 * 60 * 24 * 90; // 90 days

// ─── Token storage (Redis — no migration needed, tokens are ephemeral) ─────────

export async function storePushToken(userId: string, token: string) {
  if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) return;
  await redis.set(`pushtoken:${userId}`, token, 'EX', TOKEN_TTL);
}

async function getToken(userId: string): Promise<string | null> {
  return redis.get(`pushtoken:${userId}`).catch(() => null);
}

async function getTokens(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const keys = userIds.map((id) => `pushtoken:${id}`);
  const values = await redis.mget(...keys).catch(() => userIds.map(() => null));
  return Object.fromEntries(
    userIds.map((id, i) => [id, values[i] ?? '']).filter(([, v]) => v),
  );
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
}

async function sendPush(messages: PushPayload[]) {
  if (messages.length === 0) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('[Push] Failed to send:', err);
  }
}

// ─── Typed notification senders ───────────────────────────────────────────────

export async function notifyNewMatch(
  womanId: string,
  manId: string,
  matcherName: string,
  matchId: string,
) {
  const tokens = await getTokens([womanId, manId]);

  const messages: PushPayload[] = [];

  if (tokens[womanId]) {
    messages.push({
      to: tokens[womanId],
      title: '🎉 New Match!',
      body: `You and ${matcherName} liked each other.`,
      data: { screen: 'chat', matchId },
      sound: 'default',
    });
  }

  if (tokens[manId]) {
    messages.push({
      to: tokens[manId],
      title: '🎉 New Match!',
      body: `You matched with someone on Manter.`,
      data: { screen: 'matches' },
      sound: 'default',
    });
  }

  await sendPush(messages);
}

export async function notifyNewMessage(
  recipientId: string,
  senderName: string,
  messagePreview: string,
  matchId: string,
) {
  const token = await getToken(recipientId);
  if (!token) return;

  const preview =
    messagePreview.length > 60 ? messagePreview.slice(0, 57) + '…' : messagePreview;

  await sendPush([{
    to: token,
    title: senderName,
    body: preview,
    data: { screen: 'chat', matchId },
    sound: 'default',
  }]);
}

export async function notifyRedFlagAlert(
  recipientId: string,
  matchId: string,
) {
  const token = await getToken(recipientId);
  if (!token) return;

  await sendPush([{
    to: token,
    title: '⚠️ Safety Alert',
    body: 'Manter detected a potential red flag in your conversation. Tap to review.',
    data: { screen: 'chat', matchId },
    sound: 'default',
  }]);
}

export async function notifyNewRating(manId: string, ratingCount: number) {
  const token = await getToken(manId);
  if (!token) return;

  await sendPush([{
    to: token,
    title: '⭐ New Rating',
    body: ratingCount === 1
      ? 'A woman has rated your profile.'
      : `${ratingCount} women have rated your profile.`,
    data: { screen: 'profile' },
    sound: 'default',
  }]);
}
