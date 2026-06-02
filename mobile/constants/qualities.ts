import { QualityKey } from '../../shared/types';

export interface Quality {
  key: QualityKey;
  label: string;
  description: string;
  category: 'respect' | 'emotional' | 'character' | 'practical' | 'safety';
}

export const QUALITIES: Quality[] = [
  {
    key: 'q1',
    label: 'Respects Her Decisions',
    description: 'Respects her independence and personal choices without trying to override them',
    category: 'respect',
  },
  {
    key: 'q2',
    label: 'Protects, Not Controls',
    description: 'Protective of her wellbeing without being possessive or controlling',
    category: 'safety',
  },
  {
    key: 'q3',
    label: 'Supportive of Her Growth',
    description: 'Cheers her on when she succeeds instead of feeling threatened or jealous',
    category: 'respect',
  },
  {
    key: 'q4',
    label: 'Trustworthy',
    description: 'Loyal, honest, kind, and consistently caring — a person she can rely on',
    category: 'character',
  },
  {
    key: 'q5',
    label: 'Genuine Connection',
    description: 'Their thoughts connect and their energy naturally matches',
    category: 'emotional',
  },
  {
    key: 'q6',
    label: 'Stands Up for Her',
    description: 'Speaks up for her and takes her side when she needs him to',
    category: 'character',
  },
  {
    key: 'q7',
    label: 'Notices Small Things',
    description: 'Pays attention to the small details that matter to her',
    category: 'emotional',
  },
  {
    key: 'q8',
    label: 'Patient & Gives Space',
    description: 'Does not rush into things and respects when she needs space',
    category: 'emotional',
  },
  {
    key: 'q9',
    label: 'Emotionally Intelligent',
    description: 'Emotionally mature — understands feelings, reads situations, responds thoughtfully',
    category: 'emotional',
  },
  {
    key: 'q10',
    label: 'Sense of Humor',
    description: 'Funny, light-hearted, and brings joy into everyday moments',
    category: 'character',
  },
  {
    key: 'q11',
    label: 'Respects Boundaries',
    description: 'Never pressures her into anything she is not comfortable with — no means no',
    category: 'safety',
  },
  {
    key: 'q12',
    label: 'Safe Presence',
    description: 'His presence makes her feel comfortable and safe being fully herself',
    category: 'safety',
  },
  {
    key: 'q13',
    label: 'Confident & Self-Respecting',
    description: 'Has a healthy level of confidence and genuine self-respect',
    category: 'character',
  },
  {
    key: 'q14',
    label: 'Expresses Emotions Freely',
    description: 'Able to openly share his feelings without hiding behind "I am the man" stereotypes',
    category: 'emotional',
  },
  {
    key: 'q15',
    label: 'Respects Womanhood',
    description: 'Does not treat periods or female experiences as a taboo — he understands them',
    category: 'respect',
  },
  {
    key: 'q16',
    label: 'Never Mocks Women',
    description: 'Does not put women down in social situations or laugh at misogynistic jokes to fit in',
    category: 'respect',
  },
  {
    key: 'q17',
    label: 'Ambitious & Futuristic',
    description: 'Driven, works hard, and actively builds toward a better future',
    category: 'practical',
  },
  {
    key: 'q18',
    label: 'No Anger Issues',
    description: 'His presence feels calm and peaceful — not tense, unpredictable, or toxic',
    category: 'safety',
  },
  {
    key: 'q19',
    label: 'Takes Responsibility (50/50)',
    description: 'Knows how to cook, does household chores, and shares responsibilities equally',
    category: 'practical',
  },
  {
    key: 'q20',
    label: 'Reliable',
    description: 'When he says he will do something, he does it — consistently',
    category: 'character',
  },
  {
    key: 'q21',
    label: 'Basic Manners',
    description: 'Does not judge people by money, appearance, or circumstances',
    category: 'character',
  },
  {
    key: 'q22',
    label: 'Humble & Down-to-Earth',
    description: 'Grounded, approachable, and does not act above others',
    category: 'character',
  },
  {
    key: 'q23',
    label: 'No Ego',
    description: 'Does not let ego drive his decisions or damage the relationship',
    category: 'emotional',
  },
];

export const QUALITY_CATEGORIES = {
  respect: 'Respect & Advocacy',
  emotional: 'Emotional Maturity',
  character: 'Character & Trust',
  practical: 'Practical Partnership',
  safety: 'Safety & Boundaries',
};
