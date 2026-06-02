import { claude } from '../lib/claude';
import { prisma } from '../lib/prisma';
import {
  RedFlagCategory,
  RedFlagScanResult,
  ConversationAnalysis,
  FlagPattern,
  ConversationHealth,
  RedFlagStats,
} from '../../../shared/types';

const FLAG_CATEGORIES: RedFlagCategory[] = [
  'controlling_language',
  'anger_escalation',
  'guilt_trip',
  'rushes_intimacy',
  'dismisses_feelings',
  'possessiveness',
  'social_misogyny',
];

const SYSTEM_PROMPT = `You are a safety assistant for a dating app. Analyze the conversation excerpt below and identify behavioral red flags directed at a woman by a man.

Categories to detect:
- controlling_language: telling her what to wear, where to go, who to talk to
- anger_escalation: tone becoming aggressive or hostile when challenged
- guilt_trip: making her feel bad for saying no
- rushes_intimacy: creating urgency around physical/emotional closeness
- dismisses_feelings: "you're overreacting", "you're too sensitive"
- possessiveness: jealousy, wanting to track her, upset about her social life
- social_misogyny: disrespectful comments about women generally

Respond with JSON only:
{
  "score": <0.0 to 1.0, where 1.0 is very concerning>,
  "flags": [<category strings from the list above>],
  "explanation": "<one sentence for the user, empathetic and clear>"
}

If no red flags: { "score": 0, "flags": [], "explanation": "" }`;

interface MessageContext {
  role: 'man' | 'woman';
  content: string;
}

export async function scanForRedFlags(
  messages: MessageContext[],
): Promise<RedFlagScanResult> {
  const conversation = messages
    .map((m) => `${m.role === 'man' ? 'Him' : 'Her'}: ${m.content}`)
    .join('\n');

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: conversation }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const parsed = JSON.parse(text) as RedFlagScanResult;
    // Sanitize: only allow known flag categories
    parsed.flags = (parsed.flags ?? []).filter((f): f is RedFlagCategory =>
      FLAG_CATEGORIES.includes(f as RedFlagCategory),
    );
    parsed.score = Math.max(0, Math.min(1, parsed.score ?? 0));
    return parsed;
  } catch {
    return { score: 0, flags: [], explanation: '' };
  }
}

// ─── Full conversation analysis ───────────────────────────────────────────────

const ANALYSIS_SYSTEM = `You are a relationship safety analyst for a women's dating app called Manter.
Analyze the full conversation below — messages between a woman (Her) and a man (Him).
Identify behavioral patterns — both concerning and positive.

Flag categories to detect:
- controlling_language: dictating her choices, appearance, friendships, or movements
- anger_escalation: tone becoming aggressive or hostile when challenged or told no
- guilt_trip: making her feel responsible or bad for setting a limit
- rushes_intimacy: urgency or pressure around physical or emotional closeness
- dismisses_feelings: invalidating her emotions ("you're overreacting", "you're too sensitive")
- possessiveness: jealousy, questions about who she talks to, wanting to track her
- social_misogyny: disrespectful jokes or attitudes toward women generally

Severity:
- mild: one-off, could be misread, low concern
- moderate: pattern across 2–3 messages, worth watching
- severe: clear, repeated, or escalating — trust your instincts

Respond with JSON only, no prose outside the JSON:
{
  "overallScore": <0.0–1.0, 0 = no concerns, 1 = very concerning>,
  "health": <"healthy" | "caution" | "concerning">,
  "summary": "<2–3 sentences: honest, empathetic overview of the conversation>",
  "patterns": [
    {
      "category": "<flag category>",
      "severity": "<mild|moderate|severe>",
      "count": <integer, how many times you observed this>,
      "explanation": "<specific, evidence-based explanation — what he said and why it matters>",
      "excerpt": "<short direct quote from his messages that illustrates this>"
    }
  ],
  "greenFlags": ["<specific positive behavior you observed>"],
  "recommendation": "<1–2 sentences: actionable, empathetic guidance for her>"
}

If the conversation is genuinely healthy and no flags are found, patterns should be [] and health should be "healthy".`;

export async function analyzeConversation(
  messages: MessageContext[],
): Promise<ConversationAnalysis> {
  if (messages.length === 0) {
    return emptyAnalysis();
  }

  const conversation = messages
    .map((m) => `${m.role === 'man' ? 'Him' : 'Her'}: ${m.content}`)
    .join('\n');

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: ANALYSIS_SYSTEM,
    messages: [{ role: 'user', content: conversation }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const parsed = JSON.parse(text) as Omit<ConversationAnalysis, 'analyzedAt'>;

    parsed.overallScore = Math.max(0, Math.min(1, parsed.overallScore ?? 0));
    parsed.patterns = (parsed.patterns ?? []).map((p) => ({
      ...p,
      category: FLAG_CATEGORIES.includes(p.category as RedFlagCategory)
        ? (p.category as RedFlagCategory)
        : 'controlling_language',
      severity: (['mild', 'moderate', 'severe'].includes(p.severity) ? p.severity : 'mild') as FlagPattern['severity'],
      count: Math.max(1, p.count ?? 1),
    }));
    parsed.greenFlags = parsed.greenFlags ?? [];
    parsed.health = (['healthy', 'caution', 'concerning'].includes(parsed.health)
      ? parsed.health
      : 'healthy') as ConversationHealth;

    return { ...parsed, analyzedAt: new Date().toISOString() };
  } catch {
    return emptyAnalysis();
  }
}

function emptyAnalysis(): ConversationAnalysis {
  return {
    overallScore: 0,
    health: 'healthy',
    summary: 'Not enough messages to analyze.',
    patterns: [],
    greenFlags: [],
    recommendation: 'Keep chatting and check back once there are more messages.',
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Aggregate red flag stats for a man ───────────────────────────────────────

export async function getRedFlagStatsForUser(manId: string): Promise<RedFlagStats> {
  // All matches this man has had
  const matches = await prisma.match.findMany({
    where: { manId, status: 'MATCHED' },
    select: { id: true },
  });

  if (matches.length === 0) {
    return { totalConversations: 0, flaggedConversations: 0, flagRate: 0, averageScore: 0, topCategories: [] };
  }

  const matchIds = matches.map((m) => m.id);

  // All flagged messages from him across all matches
  const flaggedMessages = await prisma.message.findMany({
    where: {
      matchId: { in: matchIds },
      senderId: manId,
      redFlagScore: { gt: 0 },
    },
    select: { matchId: true, redFlagScore: true, redFlagsFound: true },
  });

  const flaggedMatchIds = new Set(flaggedMessages.map((m) => m.matchId));
  const allScores = flaggedMessages.map((m) => m.redFlagScore ?? 0);
  const averageScore = allScores.length > 0
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0;

  // Tally flag categories
  const categoryCounts: Partial<Record<RedFlagCategory, number>> = {};
  for (const msg of flaggedMessages) {
    const flags = (msg.redFlagsFound ?? []) as RedFlagCategory[];
    for (const flag of flags) {
      categoryCounts[flag] = (categoryCounts[flag] ?? 0) + 1;
    }
  }

  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category, count]) => ({ category: category as RedFlagCategory, count }));

  return {
    totalConversations: matches.length,
    flaggedConversations: flaggedMatchIds.size,
    flagRate: flaggedMatchIds.size / matches.length,
    averageScore: Math.round(averageScore * 100) / 100,
    topCategories,
  };
}
