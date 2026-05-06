export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  birth_date?: string;
  motive?: string;
  chance?: string;
  tokens: number;
  streak: number;
  streak_count: number;
  last_active?: string;
  last_reflection_date?: string;
  subscription: 'free' | 'pro';
  pro_until?: string;
  profile_completed: number;
  language: string;
}

export interface Reflection {
  id: number;
  user_id: number;
  mode: 'morning' | 'evening' | 'optional';
  question: string;
  question_id?: number;
  answer: string;
  feedback?: string;
  category?: string;
  subcategory?: string;
  created_at: string;
}

export interface Question {
  id: number;
  category: string;
  subcategory?: string;
  difficulty: number;
  mode: 'morning' | 'evening' | 'any';
  text: string;
  suggested_tips?: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: number;
  motive?: string;
  chance?: string;
  last_q_text?: string;
  last_q_day?: string;
  member_count?: number;
  members?: GroupMember[];
  recentReflections?: GroupReflection[];
  created_at: string;
}

export interface GroupMember {
  id: number;
  username: string;
  first_name?: string;
  streak: number;
}

export interface GroupReflection {
  id: number;
  group_id: string;
  user_id: number;
  username: string;
  first_name?: string;
  question: string;
  answer: string;
  feedback?: string;
  created_at: string;
}

export interface CategoryScore {
  category: string;
  score: number;
}

export interface TokenTransaction {
  id: number;
  amount: number;
  reason: string;
  created_at: string;
}

export interface ReflectionStats {
  scores: CategoryScore[];
  totalReflections: number;
  streak: number;
  tokens: number;
  last_reflection_date?: string;
  byCategoryCount: { category: string; count: number }[];
}

export const CATEGORY_LABELS: Record<string, string> = {
  selbstbild: 'Selbstbild',
  emotion: 'Emotion',
  gewohnheit: 'Gewohnheit',
  beziehung: 'Beziehung',
  mindset: 'Mindset',
  vision: 'Vision',
  zukunft: 'Zukunft',
};
