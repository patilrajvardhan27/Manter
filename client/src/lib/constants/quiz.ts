/**
 * Behavioral quiz for men — scenario questions with no obviously "correct"
 * answer (why_manter.md §6). Each option nudges per-quality self-assessment
 * scores. Patterns emerge across answers rather than from any single one.
 */

export interface QuizOption {
  id: string;
  text: string;
  /** quality key -> delta contribution (−2..+2) */
  effects: Record<string, number>;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1_decision",
    prompt:
      "She's been offered a job in another city that means living apart for a year. She asks what you think.",
    options: [
      { id: "a", text: "“It's your call — I'll back whatever you decide and we'll make distance work.”", effects: { respects_decisions: 2, supportive_not_jealous: 2, protects_not_controls: 1 } },
      { id: "b", text: "“I'd really rather you didn't go — we just got comfortable.”", effects: { supportive_not_jealous: -1, respects_decisions: -1 } },
      { id: "c", text: "“Let's weigh it together, but honestly the upside for you looks big.”", effects: { supportive_not_jealous: 1, ambitious: 1, respects_decisions: 1 } },
    ],
  },
  {
    id: "q2_conflict",
    prompt: "Mid-argument you realize you were actually in the wrong about something you said.",
    options: [
      { id: "a", text: "Pause, own it, apologize clearly, and ask how to make it right.", effects: { emotionally_intelligent: 2, no_ego: 2, expresses_emotions: 1 } },
      { id: "b", text: "Move on quietly — bringing it up again just reopens it.", effects: { no_ego: 0, emotionally_intelligent: -1 } },
      { id: "c", text: "Defend the point — you mostly meant well.", effects: { no_ego: -2, emotionally_intelligent: -1 } },
    ],
  },
  {
    id: "q3_boundary",
    prompt: "She says she's not ready to be physical yet, though you are.",
    options: [
      { id: "a", text: "“Completely fine — there's no clock here. Tell me whenever, or never.”", effects: { respects_boundaries: 2, patient: 2, feels_safe: 1 } },
      { id: "b", text: "Say it's fine but bring it up again every week or so.", effects: { respects_boundaries: -2, patient: -1, guilt_adjacent: 0 } },
      { id: "c", text: "“Okay — what would help you feel more comfortable with me?”", effects: { respects_boundaries: 1, patient: 1, feels_safe: 2 } },
    ],
  },
  {
    id: "q4_chores",
    prompt: "You've both had an exhausting week. The flat is a mess and neither of you cooked.",
    options: [
      { id: "a", text: "“I'll cook tonight, you take the dishes tomorrow — or swap, whatever's easier.”", effects: { shares_chores: 2, reliable: 1, partnership_balance: 0 } },
      { id: "b", text: "Order in and leave the rest for the weekend.", effects: { shares_chores: 0, reliable: 0 } },
      { id: "c", text: "Wait for her to start, then help.", effects: { shares_chores: -2, reliable: -1 } },
    ],
  },
  {
    id: "q5_friends",
    prompt: "Your friends start making jokes that put women down, expecting you to laugh along.",
    options: [
      { id: "a", text: "Call it out, even if it's awkward: “Not funny, leave it.”", effects: { no_misogyny: 2, confident_self_respect: 1, basic_manners: 1 } },
      { id: "b", text: "Stay quiet — not your fight, you just won't join in.", effects: { no_misogyny: -1, confident_self_respect: -1 } },
      { id: "c", text: "Laugh to keep the peace, mention it later one-on-one.", effects: { no_misogyny: 0, confident_self_respect: 0 } },
    ],
  },
  {
    id: "q6_emotion",
    prompt: "You've had genuinely rough news. She notices something's off and asks.",
    options: [
      { id: "a", text: "Open up about how you actually feel, even if it's heavy.", effects: { expresses_emotions: 2, emotionally_intelligent: 1, feels_safe: 1 } },
      { id: "b", text: "“I'm fine” — you handle your own stuff.", effects: { expresses_emotions: -2, emotionally_intelligent: -1 } },
      { id: "c", text: "Share a little, but keep the worst of it to yourself.", effects: { expresses_emotions: 1, emotionally_intelligent: 0 } },
    ],
  },
];
