export type Role = 'WOMAN' | 'MAN';
export type MatchStatus = 'PENDING' | 'MATCHED' | 'DECLINED';
export type ReportReason =
  | 'HARASSMENT'
  | 'FAKE_PROFILE'
  | 'INAPPROPRIATE_CONTENT'
  | 'THREATENING'
  | 'CATFISH'
  | 'OTHER';

// 23 quality keys
export type QualityKey =
  | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9' | 'q10'
  | 'q11' | 'q12' | 'q13' | 'q14' | 'q15' | 'q16' | 'q17' | 'q18' | 'q19'
  | 'q20' | 'q21' | 'q22' | 'q23';

export type QualityScores = Record<QualityKey, number>;

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  age: number;
  bio?: string;
  photos: string[];
  city?: string;
  isVerified: boolean;
  idVerified: boolean;
  createdAt: string;
  quizCompleted: boolean;
}

export interface ManProfile {
  userId: string;
  qualityScores: QualityScores;
  communityScore: number;
  ratingCount: number;
}

export interface WomanProfile {
  userId: string;
  qualityWeights: QualityScores;
}

export interface Match {
  id: string;
  womanId: string;
  manId: string;
  status: MatchStatus;
  compatibilityScore: number;
  createdAt: string;
  otherUser?: User;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  redFlagScore?: number;
  redFlagsFound?: RedFlagCategory[];
  readAt?: string;
  createdAt: string;
}

export type RedFlagCategory =
  | 'controlling_language'
  | 'anger_escalation'
  | 'guilt_trip'
  | 'rushes_intimacy'
  | 'dismisses_feelings'
  | 'possessiveness'
  | 'social_misogyny';

export interface RedFlagScanResult {
  score: number;
  flags: RedFlagCategory[];
  explanation: string;
}

export type ConversationHealth = 'healthy' | 'caution' | 'concerning';

export interface FlagPattern {
  category: RedFlagCategory;
  severity: 'mild' | 'moderate' | 'severe';
  count: number;
  explanation: string;
  // Representative quote from the conversation, anonymised
  excerpt?: string;
}

export interface ConversationAnalysis {
  overallScore: number;           // 0–1
  health: ConversationHealth;
  summary: string;
  patterns: FlagPattern[];
  greenFlags: string[];
  recommendation: string;
  analyzedAt: string;
}

export interface RedFlagStats {
  totalConversations: number;
  flaggedConversations: number;
  flagRate: number;               // 0–1
  averageScore: number;           // 0–1
  topCategories: { category: RedFlagCategory; count: number }[];
}

export interface Rating {
  id: string;
  raterId: string;
  ratedId: string;
  qualityScores: QualityScores;
  overallScore: number;
  reviewText?: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface SafetyCheckin {
  id: string;
  userId: string;
  dateWithUserId?: string;
  scheduledAt: string;
  confirmedAt?: string;
  alertSent: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

// API response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
