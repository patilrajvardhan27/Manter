/**
 * The onboarding character quiz — situational questions grounded in real,
 * well-documented incident patterns (e.g. the viral ₹370 biryani story about
 * dating entitlement; workplace/family discrimination LGBTQ+ people face).
 * Every profile answers the same bank regardless of gender — agreement is
 * scored deterministically against the 23-quality framework via the picked
 * Likert level's effects (see lib/constants/likert.ts), so the mechanic and
 * the visible score/reason on a profile work identically for everyone.
 */
import { likertOptions } from "./likert";

export interface SituationalQuestion {
  id: string;
  prompt: string;
  options: ReturnType<typeof likertOptions>;
}

export const SITUATIONAL_QUESTIONS: SituationalQuestion[] = [
  {
    id: "s1_online_hate",
    prompt:
      "A partner gets sent sexist or hateful messages by a stranger online after posting something completely ordinary — work, an opinion, a photo. How much do you agree: “Taking it seriously and asking what would actually help matters more than telling them to just ignore it.”",
    options: likertOptions([
      { key: "takes_her_side", positive: true },
      { key: "feels_safe", positive: true },
    ]),
  },
  {
    id: "s2_stereotyped_in_front_of_partner",
    prompt:
      "Someone makes a sweeping negative comment about an entire group, right in front of a partner who belongs to that group. How much do you agree: “Saying something in the moment matters more than staying quiet to avoid awkwardness.”",
    options: likertOptions([
      { key: "takes_her_side", positive: true },
      { key: "confident_self_respect", positive: true },
    ]),
  },
  {
    id: "s3_bill_no_strings",
    prompt:
      "Like the viral ₹370 biryani story — someone pays for a date's dinner, and afterward the other person doesn't want anything physical. How much do you agree: “What got paid for dinner doesn't entitle anyone to anything afterward — a 'no' stands regardless of the bill.”",
    options: likertOptions([
      { key: "respects_boundaries", positive: true },
      { key: "no_ego", positive: true },
    ]),
  },
  {
    id: "s4_seclusion_deserves",
    prompt:
      "After paying for dinner, a date suggests going somewhere secluded and hints they \"deserve\" something in return. How much do you agree: “That's an immediate red flag, not just an awkward moment.”",
    options: likertOptions([
      { key: "respects_boundaries", positive: true },
      { key: "no_ego", positive: true },
    ]),
  },
  {
    id: "s5_early_end_owed_time",
    prompt:
      "Someone covers transport, food, and drinks on a first date, and the other person wants to end the evening early. How much do you agree: “A bit of disappointment is normal, but nobody owes anyone more time because of what got spent.”",
    options: likertOptions([
      { key: "respects_decisions", positive: true },
      { key: "no_ego", positive: true },
    ]),
  },
  {
    id: "s6_upset_at_declined_kiss",
    prompt:
      "Someone gets visibly upset when their date declines a kiss or any physical contact at the end of the night. How much do you agree: “That reaction alone is a red flag, not just normal disappointment.”",
    options: likertOptions([
      { key: "respects_boundaries", positive: true },
      { key: "patient", positive: true },
    ]),
  },
  {
    id: "s7_recover_money_framing",
    prompt:
      "After one person declines anything further, the other suggests they're owed something for what they spent — even joking about \"recovering their money.\" How much do you agree: “That framing alone says a lot about someone's values — it's not something to overlook.”",
    options: likertOptions([
      { key: "trustworthy", positive: true },
      { key: "no_ego", positive: true },
    ]),
  },
  {
    id: "s8_boundary_pushed_to_stay",
    prompt:
      "Someone says they want to leave a date and head home, and their date keeps pushing them to stay out longer. How much do you agree: “If 'I want to go home' isn't respected the first time, that matters more than how the rest of the date went.”",
    options: likertOptions([
      { key: "respects_boundaries", positive: true },
      { key: "respects_decisions", positive: true },
    ]),
  },
  {
    id: "s9_workplace_discrimination",
    prompt:
      "A partner comes out at work and their manager starts quietly giving them worse shifts and vague excuses for skipped promotions — nothing said outright, just a pattern. How much do you agree: “That deserves to be taken seriously as discrimination, not brushed off as them overreacting.”",
    options: likertOptions([
      { key: "takes_her_side", positive: true },
      { key: "emotionally_intelligent", positive: true },
    ]),
  },
  {
    id: "s10_family_rejection",
    prompt:
      "A partner's family reacts to them coming out by cutting them off financially and emotionally, right before the holidays. How much do you agree: “Whatever that family does, stepping up so they're not facing it alone matters more than staying neutral.”",
    options: likertOptions([
      { key: "trustworthy", positive: true },
      { key: "feels_safe", positive: true },
    ]),
  },
  {
    id: "s11_outed_without_consent",
    prompt:
      "Someone close to a partner — a friend, a relative — tells other people about that partner's identity before the partner was ready to share it themselves. How much do you agree: “That's a serious breach of trust, not just an awkward slip.”",
    options: likertOptions([
      { key: "trustworthy", positive: true },
      { key: "respects_decisions", positive: true },
    ]),
  },
  {
    id: "s12_dating_app_bait_harassment",
    prompt:
      "A stranger matches with someone online, seems interested for days, then sends cruel messages the moment that person mentions their identity. How much do you agree: “Checking in on how they're doing afterward matters more than calling it just how the internet is.”",
    options: likertOptions([
      { key: "feels_safe", positive: true },
      { key: "emotionally_intelligent", positive: true },
    ]),
  },
  {
    id: "s13_public_harassment_holding_hands",
    prompt:
      "Walking together, a stranger shouts something hostile at a couple just for holding hands in public. How much do you agree: “Staying calm but still checking in with your partner matters more than pretending it didn't happen.”",
    options: likertOptions([
      { key: "takes_her_side", positive: true },
      { key: "confident_self_respect", positive: true },
    ]),
  },
  {
    id: "s14_conversion_pressure",
    prompt:
      "A partner's relatives keep pushing the idea that who the partner is is \"a phase\" that therapy or marriage could fix, and ask the other partner to go along with it. How much do you agree: “Not going along with that matters more than avoiding tension with their family.”",
    options: likertOptions([
      { key: "respects_decisions", positive: true },
      { key: "no_ego", positive: true },
    ]),
  },
];
