import { RedFlagCategory } from '../../shared/types';

export const RED_FLAG_LABELS: Record<RedFlagCategory, string> = {
  controlling_language: 'Controlling Language',
  anger_escalation: 'Anger Escalation',
  guilt_trip: 'Guilt-Tripping',
  rushes_intimacy: 'Rushing Intimacy',
  dismisses_feelings: 'Dismissing Your Feelings',
  possessiveness: 'Possessiveness',
  social_misogyny: 'Disrespect Toward Women',
};

export const RED_FLAG_DESCRIPTIONS: Record<RedFlagCategory, string> = {
  controlling_language:
    'Language that tries to dictate your choices, appearance, friendships, or movements.',
  anger_escalation:
    'Tone that starts calm but becomes aggressive, hostile, or threatening when challenged.',
  guilt_trip:
    'Making you feel bad or responsible for saying no to a request.',
  rushes_intimacy:
    'Creating urgency or pressure around physical or emotional closeness before trust is built.',
  dismisses_feelings:
    '"You\'re overreacting", "you\'re too sensitive" — language that invalidates how you feel.',
  possessiveness:
    'Questions about who you are talking to, jealousy over your time, or wanting to track you.',
  social_misogyny:
    'Jokes, comments, or attitudes that disrespect women as a group.',
};
