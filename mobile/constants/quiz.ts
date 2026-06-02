export interface QuizQuestion {
  id: string;
  scenario: string;
  question: string;
  hint: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q_conflict',
    scenario: 'You and your partner have an argument. She explains why she is hurt by something you said.',
    question: 'What do you do, and why?',
    hint: 'Describe specifically how you would respond in that moment.',
  },
  {
    id: 'q_success',
    scenario: 'Your partner gets promoted to a role more senior than yours, earning significantly more.',
    question: 'How do you feel about it, and how does it affect the relationship?',
    hint: 'Be honest — describe your real feelings, not just the ideal ones.',
  },
  {
    id: 'q_boundary',
    scenario: 'You want to be physical but your partner says she is not ready yet.',
    question: 'What do you do next, and how do you handle your own feelings about it?',
    hint: 'Walk through exactly how you would respond.',
  },
  {
    id: 'q_household',
    scenario: 'You and your partner both work full time. She gets home exhausted after a tough day.',
    question: 'What does a typical evening look like in your home when she is worn out?',
    hint: 'Give a specific example of what you would actually do.',
  },
  {
    id: 'q_friends',
    scenario: 'Your close friends make a sexist joke about women in the group chat.',
    question: 'What do you do in that moment, and why?',
    hint: 'Be specific about what you would actually say or do, not what sounds right.',
  },
  {
    id: 'q_feelings',
    scenario: 'You are going through a difficult time — work stress, family pressure.',
    question: 'How do you handle this with your partner? What do you share, what do you keep to yourself, and why?',
    hint: 'Describe how you actually deal with hardship in relationships.',
  },
];
