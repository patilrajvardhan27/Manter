import { claude } from '../lib/claude';
import { QualityKey, QualityScores } from '../../../shared/types';

const ALL_KEYS: QualityKey[] = [
  'q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11','q12',
  'q13','q14','q15','q16','q17','q18','q19','q20','q21','q22','q23',
];

export interface FreeTextAnswer {
  questionId: string;
  scenario: string;
  question: string;
  answer: string;
}

const QUALITY_DEFINITIONS = `
q1  – Respects Her Decisions: respects her independence and choices without overriding them
q2  – Protects Not Controls: protective of her wellbeing without being possessive or controlling
q3  – Supportive of Her Growth: celebrates her success instead of feeling threatened
q4  – Trustworthy: loyal, honest, consistent
q5  – Genuine Connection: values emotional depth and authentic communication
q6  – Stands Up for Her: defends her and takes her side when she needs it
q7  – Notices Small Things: attentive to details that matter to her
q8  – Patient & Gives Space: does not rush things or pressure her timeline
q9  – Emotionally Intelligent: reads situations accurately, responds thoughtfully
q10 – Sense of Humor: light-hearted and brings joy, not sarcasm at her expense
q11 – Respects Boundaries: accepts "no" without pushback, pressure, or sulking
q12 – Safe Presence: his energy makes her feel safe being fully herself
q13 – Confident & Self-Respecting: secure in himself, not threatened by her
q14 – Expresses Emotions Freely: shares feelings openly, not hidden behind "I'm a man"
q15 – Respects Womanhood: understands female experiences without dismissing them
q16 – Never Mocks Women: does not laugh at or participate in misogynistic jokes
q17 – Ambitious & Futuristic: driven, works toward a better future
q18 – No Anger Issues: calm and predictable — not tense, explosive, or passive-aggressive
q19 – Shares Responsibilities: cooks, cleans, does not wait to be asked
q20 – Reliable: follows through consistently on what he says
q21 – Basic Manners: does not judge people by money, appearance, or status
q22 – Humble & Down-to-Earth: grounded, not arrogant or performative
q23 – No Ego: does not let ego damage conversations or decisions
`.trim();

const SYSTEM_PROMPT = `You are evaluating a man's character for a women's safety dating app called Manter.
You have received his free-text responses to scenario-based questions.

Your task: score him on 23 character qualities (1–10 each) based solely on what his answers reveal.

Quality definitions:
${QUALITY_DEFINITIONS}

Scoring guidance:
- 8–10: Answer shows genuine self-awareness, specific detail, consistency with other answers, or honest acknowledgment of imperfection alongside growth.
- 5–7: Answer is adequate but vague, generic, or sounds rehearsed. "I would listen to her" with no specifics is a 5, not an 8.
- 2–4: Answer deflects, minimises, centres himself, or shows entitlement subtly.
- 1: Answer is a direct red flag — blaming her, minimising her feelings, resisting her autonomy.

CRITICAL — detect and penalise:
- Virtue signalling: perfect-sounding answers with zero personal detail or honesty ("I would always support her 100%")
- Inconsistency: if he says he is patient in one answer but shows impatience or self-centring in another, lower both scores
- Absence of ownership: answers that describe what she would do or what "should" happen instead of what he does
- Hedging that reveals the opposite: "I'm not the jealous type but..." or "obviously I would respect it, but..."

Score only the qualities that the answers give evidence for. For qualities with no evidence, use 5 as a neutral default.

Respond with JSON only — no prose, no markdown:
{
  "scores": {
    "q1": <1-10>, "q2": <1-10>, "q3": <1-10>, "q4": <1-10>, "q5": <1-10>,
    "q6": <1-10>, "q7": <1-10>, "q8": <1-10>, "q9": <1-10>, "q10": <1-10>,
    "q11": <1-10>, "q12": <1-10>, "q13": <1-10>, "q14": <1-10>, "q15": <1-10>,
    "q16": <1-10>, "q17": <1-10>, "q18": <1-10>, "q19": <1-10>, "q20": <1-10>,
    "q21": <1-10>, "q22": <1-10>, "q23": <1-10>
  }
}`;

export async function evaluateQuizWithAI(answers: FreeTextAnswer[]): Promise<QualityScores> {
  const userContent = answers
    .map((a, i) =>
      `Q${i + 1} — ${a.scenario}\n"${a.question}"\nHis answer: ${a.answer}`,
    )
    .join('\n\n---\n\n');

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const parsed = JSON.parse(text) as { scores: Record<string, number> };
    const raw = parsed.scores ?? {};

    return Object.fromEntries(
      ALL_KEYS.map((k) => [k, Math.max(1, Math.min(10, Math.round(raw[k] ?? 5)))]),
    ) as QualityScores;
  } catch {
    // Fallback to neutral scores if parsing fails
    return Object.fromEntries(ALL_KEYS.map((k) => [k, 5])) as QualityScores;
  }
}
