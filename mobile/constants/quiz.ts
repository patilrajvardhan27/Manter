import { QualityKey } from '../../shared/types';

export interface QuizOption {
  id: string;
  text: string;
  // Quality scores this answer contributes to (key → score delta)
  scores: Partial<Record<QualityKey, number>>;
}

export interface QuizQuestion {
  id: string;
  scenario: string;
  question: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q_conflict',
    scenario: 'You and your partner have an argument. She explains why she is hurt by something you said.',
    question: 'What do you do?',
    options: [
      {
        id: 'a',
        text: 'Listen fully, acknowledge her feelings, and apologize sincerely even if it was unintentional',
        scores: { q9: 3, q14: 2, q23: 2 },
      },
      {
        id: 'b',
        text: 'Explain your perspective first, then acknowledge hers',
        scores: { q9: 1, q14: 1 },
      },
      {
        id: 'c',
        text: 'Tell her she is overreacting and that you did not mean it badly',
        scores: { q9: -2, q18: -1 },
      },
      {
        id: 'd',
        text: 'Go quiet and avoid the conversation until things calm down',
        scores: { q14: -1, q8: -1 },
      },
    ],
  },
  {
    id: 'q_success',
    scenario: 'Your partner gets promoted to a role more senior than yours, earning significantly more.',
    question: 'How do you feel and respond?',
    options: [
      {
        id: 'a',
        text: 'Genuinely proud and celebrate her achievement enthusiastically',
        scores: { q3: 3, q23: 2, q13: 1 },
      },
      {
        id: 'b',
        text: 'Happy for her but quietly feel a little threatened',
        scores: { q3: 1, q23: -1 },
      },
      {
        id: 'c',
        text: 'Start to feel insecure about the relationship dynamic',
        scores: { q3: -1, q23: -2 },
      },
      {
        id: 'd',
        text: 'Suggest she tone it down so it does not create tension between you',
        scores: { q3: -3, q1: -2, q23: -3 },
      },
    ],
  },
  {
    id: 'q_boundary',
    scenario: 'You want to be physical but your partner says she is not ready yet.',
    question: 'What do you do?',
    options: [
      {
        id: 'a',
        text: 'Fully respect her pace without any pushback, and reassure her there is no rush',
        scores: { q11: 3, q8: 3, q2: 2 },
      },
      {
        id: 'b',
        text: 'Respect it, but later bring up that you are feeling frustrated',
        scores: { q11: 2, q8: 1 },
      },
      {
        id: 'c',
        text: 'Try to gently persuade her that it is fine',
        scores: { q11: -2, q2: -2 },
      },
      {
        id: 'd',
        text: 'Feel upset and withdraw emotionally for a while',
        scores: { q11: -1, q18: -2, q14: -1 },
      },
    ],
  },
  {
    id: 'q_household',
    scenario: 'You and your partner both work full time. She gets home exhausted after a tough day.',
    question: 'What happens with dinner and chores?',
    options: [
      {
        id: 'a',
        text: 'You already started dinner and split the remaining chores without being asked',
        scores: { q19: 3, q20: 2, q6: 1 },
      },
      {
        id: 'b',
        text: 'You ask if she needs help and split things based on who has more energy',
        scores: { q19: 2, q1: 1 },
      },
      {
        id: 'c',
        text: 'She handles dinner since you cleaned last time',
        scores: { q19: 0 },
      },
      {
        id: 'd',
        text: 'Cooking is not really your thing — she tends to take care of it',
        scores: { q19: -2, q21: -1 },
      },
    ],
  },
  {
    id: 'q_friends',
    scenario: 'Your friends make a sexist joke about women in your group chat.',
    question: 'What do you do?',
    options: [
      {
        id: 'a',
        text: 'Call it out directly — that kind of joke is not something you find funny',
        scores: { q16: 3, q6: 2, q4: 1 },
      },
      {
        id: 'b',
        text: 'Stay quiet but do not laugh or engage with it',
        scores: { q16: 1 },
      },
      {
        id: 'c',
        text: 'Laugh along because it is just a joke and you do not want to be difficult',
        scores: { q16: -2, q13: -1 },
      },
      {
        id: 'd',
        text: 'Add a similar joke yourself',
        scores: { q16: -3, q4: -2, q21: -2 },
      },
    ],
  },
  {
    id: 'q_feelings',
    scenario: 'You are going through a hard time personally — work stress, family issues.',
    question: 'How do you handle it with your partner?',
    options: [
      {
        id: 'a',
        text: 'Open up fully — share what you are feeling and let her in',
        scores: { q14: 3, q5: 2, q12: 1 },
      },
      {
        id: 'b',
        text: 'Mention you are stressed but keep the details mostly to yourself',
        scores: { q14: 1, q5: 1 },
      },
      {
        id: 'c',
        text: 'Handle it alone — you do not want to burden her',
        scores: { q14: 0 },
      },
      {
        id: 'd',
        text: 'Act fine on the surface even if it leaks out as irritability later',
        scores: { q14: -1, q18: -2 },
      },
    ],
  },
];
