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
  {
    id: "q7_secret",
    prompt: "You make a small mistake that costs you — money, time, or a missed plan. She'd genuinely never find out unless you told her.",
    options: [
      { id: "a", text: "Tell her anyway, even though it's awkward.", effects: { trustworthy: 2, no_ego: 1 } },
      { id: "b", text: "Quietly fix it yourself and never mention it.", effects: { trustworthy: -1, no_ego: 0 } },
      { id: "c", text: "Mention it later if it comes up naturally.", effects: { trustworthy: 0 } },
    ],
  },
  {
    id: "q8_venting",
    prompt: "She texts you a long, rambling vent about her day — no real ask, just thinking out loud.",
    options: [
      { id: "a", text: "Read it properly and respond to what she's actually feeling, not just the facts.", effects: { vibe_match: 2, emotionally_intelligent: 1, notices_small_things: 1 } },
      { id: "b", text: "Reply with quick advice on how to fix the problem she described.", effects: { vibe_match: 0, emotionally_intelligent: 0 } },
      { id: "c", text: "Send a thumbs-up or “oof” and move on — you'll talk later.", effects: { vibe_match: -1, emotionally_intelligent: -1 } },
    ],
  },
  {
    id: "q9_disrespect",
    prompt: "You're out together and someone — a stranger, a relative, an old friend — makes a backhanded comment about her choices, right in front of her.",
    options: [
      { id: "a", text: "Say something in the moment, calmly but clearly, even if it's awkward for the room.", effects: { takes_her_side: 2, no_misogyny: 1, confident_self_respect: 1 } },
      { id: "b", text: "Let it pass in the moment, but check in with her afterward and bring it up with them later.", effects: { takes_her_side: 1, confident_self_respect: 0 } },
      { id: "c", text: "Stay quiet — making a scene would only embarrass her more.", effects: { takes_her_side: -2, confident_self_respect: -1 } },
    ],
  },
  {
    id: "q10_ordinary_week",
    prompt: "It's been a totally ordinary week — nothing dramatic happened. What, if anything, do you remember noticing about how she was doing day to day?",
    options: [
      { id: "a", text: "Specific small stuff — a mood shift, something she mentioned once and you followed up on.", effects: { notices_small_things: 2, emotionally_intelligent: 1, vibe_match: 1 } },
      { id: "b", text: "The bigger things — how her week went overall, any plans she had.", effects: { notices_small_things: 0 } },
      { id: "c", text: "Honestly, not much — you were both just getting through it.", effects: { notices_small_things: -1 } },
    ],
  },
  {
    id: "q11_selfdeprecating_joke",
    prompt: "Things have been a bit tense between you for a few days. She makes a self-deprecating joke about the whole situation.",
    options: [
      { id: "a", text: "Laugh with her, then gently acknowledge what's actually going on underneath the joke.", effects: { sense_of_humour: 2, expresses_emotions: 1, emotionally_intelligent: 1 } },
      { id: "b", text: "Laugh it off and let the lighter mood carry you both past the tension.", effects: { sense_of_humour: 1, expresses_emotions: -1 } },
      { id: "c", text: "Not really in the mood to joke — you stay serious until it's properly resolved.", effects: { sense_of_humour: -1 } },
    ],
  },
  {
    id: "q12_period",
    prompt: "She tells you she's on her period and feeling low and crampy today.",
    options: [
      { id: "a", text: "Ask what would actually help — heat, food, space — and treat it like any other thing she's dealing with.", effects: { no_womanhood_taboo: 2, feels_safe: 2, notices_small_things: 1 } },
      { id: "b", text: "Say you hope she feels better and give her some space.", effects: { no_womanhood_taboo: 1, feels_safe: 0 } },
      { id: "c", text: "Feel a bit awkward about it and change the subject.", effects: { no_womanhood_taboo: -2, feels_safe: -1 } },
    ],
  },
  {
    id: "q13_praise",
    prompt: "Something you worked hard on finally pays off, and people are praising you for it — including in front of her.",
    options: [
      { id: "a", text: "Accept it, but also credit the people who helped you get there.", effects: { humble: 2, confident_self_respect: 1, no_ego: 1 } },
      { id: "b", text: "Enjoy the moment and let it run — you earned it.", effects: { humble: -1, confident_self_respect: 1 } },
      { id: "c", text: "Downplay it so much that it gets a bit awkward for whoever's praising you.", effects: { humble: 0, confident_self_respect: -1 } },
    ],
  },
  {
    id: "q14_coworker",
    prompt: "She mentions she's been hitting it off with a male coworker on a project — lots of messages back and forth, genuinely just work and friendly banter.",
    options: [
      { id: "a", text: "Glad she's enjoying the project — no need to ask more than she wants to share.", effects: { supportive_not_jealous: 2, protects_not_controls: 1, respects_decisions: 1 } },
      { id: "b", text: "Ask a few curious questions about him, mostly to understand the dynamic.", effects: { supportive_not_jealous: 0, protects_not_controls: 0 } },
      { id: "c", text: "Feel uneasy about it and find a reason to bring him up again later.", effects: { supportive_not_jealous: -2, protects_not_controls: -1 } },
    ],
  },
];
