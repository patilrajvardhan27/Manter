/**
 * Situational questions asked once during a woman's onboarding — gender-based
 * hate, and real-life-incident-inspired scenarios about money/entitlement on
 * dates (mirrored from the men's side so responses on consent, boundaries,
 * and entitlement are directly comparable). Picking an option nudges her
 * starting priority (woman_weights) for whichever qualities that answer
 * reveals she cares about — she can still fine-tune every quality afterward
 * in Priorities.
 */
import { likertOptions } from "./likert";

export interface WomanQuizOption {
  id: string;
  text: string;
  /** quality key -> weight delta from the neutral starting point of 3 */
  effects: Record<string, number>;
}

export interface WomanQuizQuestion {
  id: string;
  prompt: string;
  options: WomanQuizOption[];
}

export const WOMAN_QUIZ_QUESTIONS: WomanQuizQuestion[] = [
  {
    id: "w1_hate_she_faces",
    prompt:
      "A stranger online sends you sexist, hateful messages after you post something completely ordinary — work, an opinion, a photo. How do you want a partner to react when he finds out?",
    options: [
      { id: "a", text: "Take it seriously right away — ask how you're doing, then ask what would actually help.", effects: { takes_her_side: 2, feels_safe: 2, emotionally_intelligent: 1 } },
      { id: "b", text: "Tell you to ignore it — strangers online don't matter.", effects: { takes_her_side: -1, feels_safe: -1 } },
      { id: "c", text: "Get angrier about it than you are, and make it about him going after the person.", effects: { takes_her_side: 0, no_ego: -1 } },
    ],
  },
  {
    id: "w2_hate_he_faces",
    prompt:
      "A friend of yours starts ranting that “all men are trash,” right in front of your partner. What do you actually want from him in that moment?",
    options: [
      { id: "a", text: "Stay calm, not take it personally, and trust that you don't see him that way.", effects: { confident_self_respect: 2, no_ego: 1, emotionally_intelligent: 1 } },
      { id: "b", text: "Defend himself loudly and turn the rest of the night into proving the point wrong.", effects: { confident_self_respect: -1, no_ego: -1 } },
      { id: "c", text: "Go quiet and seem hurt for the rest of the night without ever naming it.", effects: { expresses_emotions: -1, confident_self_respect: -1 } },
    ],
  },
  {
    id: "w3_bill_reminder",
    prompt:
      "Like the viral ₹370 biryani story — a date keeps bringing up what he paid for dinner as the night goes on. How much do you agree: “Hearing that would make me uneasy, even if nothing else happens.”",
    options: likertOptions([
      { key: "feels_safe", positive: true },
      { key: "respects_boundaries", positive: true },
    ]),
  },
  {
    id: "w4_seclusion_deserves",
    prompt:
      "After paying for dinner, a date suggests going somewhere secluded and says he \"deserves\" something in return. How much do you agree: “Hearing that would be an immediate red flag for me, not just an awkward moment.”",
    options: likertOptions([
      { key: "no_ego", positive: true },
      { key: "respects_boundaries", positive: true },
    ]),
  },
  {
    id: "w5_upset_at_no_kiss",
    prompt:
      "A date gets visibly upset when you decline a kiss or any physical contact. How much do you agree: “That reaction alone would be enough for me to think about leaving — not just normal disappointment.”",
    options: likertOptions([
      { key: "respects_boundaries", positive: true },
      { key: "patient", positive: true },
    ]),
  },
  {
    id: "w6_paid_then_controls",
    prompt:
      "A man pays for everything on a first date, then later uses that to start dictating where you go or what you do. How much do you agree: “That shift from generous to controlling would be a major red flag for me, not just a quirk.”",
    options: likertOptions([
      { key: "protects_not_controls", positive: true },
      { key: "respects_decisions", positive: true },
    ]),
  },
  {
    id: "w7_recover_money",
    prompt:
      "Someone implies they want to \"recover their money\" from a date by expecting intimacy. How much do you agree: “That framing alone would tell me a lot about someone's values — I wouldn't overlook it.”",
    options: likertOptions([
      { key: "trustworthy", positive: true },
      { key: "no_misogyny", positive: true },
    ]),
  },
  {
    id: "w8_boundary_not_respected",
    prompt:
      "A date pushes you to stay out longer even after you've said you want to go home. How much do you agree: “If my 'I want to go home' isn't respected the first time, that matters more to me than how the rest of the date went.”",
    options: likertOptions([
      { key: "respects_boundaries", positive: true },
      { key: "respects_decisions", positive: true },
    ]),
  },
];
