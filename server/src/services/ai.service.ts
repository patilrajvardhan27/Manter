import { claude } from '../lib/claude';
import { RedFlagCategory, RedFlagScanResult } from '../../../shared/types';

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
