export type PaymentMethod = 'cash' | 'card' | 'bank' | 'other';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
export type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom';
export type ChartPeriod = 'week' | 'month' | 'year';
export type Theme = 'light' | 'dark' | 'system';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  budgetAmount: number | null;
  budgetPeriod: BudgetPeriod | null;
  isDefault: number;
  sortOrder: number;
  createdAt: number;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  description: string;
  date: number;
  paymentMethod: PaymentMethod;
  receiptUri: string | null;
  isRecurring: number;
  recurringFrequency: RecurringFrequency | null;
  recurringEndDate: number | null;
  nextRecurringDate: number | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ExpenseWithCategory extends Expense {
  category: Category;
}

export interface Budget {
  id: string;
  categoryId: string | null;
  amount: number;
  period: BudgetPeriod;
  startDate: number;
  createdAt: number;
}

export interface BudgetWithProgress extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
}

export interface Settings {
  currency: string;
  currencySymbol: string;
  defaultPaymentMethod: PaymentMethod;
  hasCompletedOnboarding: boolean;
  notificationsEnabled: boolean;
  budgetAlerts: boolean;
  theme: Theme;
  gamificationEnabled: boolean;
}

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  percentage: number;
  count: number;
}

export interface DailySpending {
  date: string;
  amount: number;
}

export interface MonthlyComparison {
  currentMonth: number;
  lastMonth: number;
  percentChange: number;
}

// Streaks
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
}

// Player XP System
export type PlayerRank = 'Bronze Saver' | 'Silver Saver' | 'Gold Saver' | 'Platinum Saver' | 'Diamond Saver' | 'Legendary Saver';

export interface XPData {
  totalXP: number;
  currentLevel: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  rank: PlayerRank;
}

export interface GamificationData {
  streak: StreakData;
  totalExpenseCount: number;
  totalXP: number;
  currentLevel: number;
  shownLevelUps: number[];
}

export const RANK_THRESHOLDS: readonly { minLevel: number; maxLevel: number; rank: PlayerRank; colorKey: string }[] = [
  { minLevel: 1,  maxLevel: 4,  rank: 'Bronze Saver',    colorKey: 'orange' },
  { minLevel: 5,  maxLevel: 9,  rank: 'Silver Saver',    colorKey: 'textLight' },
  { minLevel: 10, maxLevel: 14, rank: 'Gold Saver',      colorKey: 'accent' },
  { minLevel: 15, maxLevel: 19, rank: 'Platinum Saver',  colorKey: 'blue' },
  { minLevel: 20, maxLevel: 29, rank: 'Diamond Saver',   colorKey: 'purple' },
  { minLevel: 30, maxLevel: 999, rank: 'Legendary Saver', colorKey: 'primary' },
] as const;

export const XP_REWARDS = {
  LOG_EXPENSE: 10,
  STREAK_BONUS_PER_DAY: 5,
  UNDER_BUDGET_MONTH: 50,
} as const;

export function xpRequiredForLevel(level: number): number {
  return level * 100;
}

export function calculateXPData(totalXP: number): XPData {
  let level = 1;
  let remainingXP = totalXP;
  while (remainingXP >= xpRequiredForLevel(level)) {
    remainingXP -= xpRequiredForLevel(level);
    level++;
  }
  return {
    totalXP,
    currentLevel: level,
    xpInCurrentLevel: remainingXP,
    xpRequiredForNextLevel: xpRequiredForLevel(level),
    rank: getRankForLevel(level),
  };
}

export function getRankForLevel(level: number): PlayerRank {
  const threshold = RANK_THRESHOLDS.find(t => level >= t.minLevel && level <= t.maxLevel);
  return threshold?.rank ?? 'Legendary Saver';
}

export function getRankColorKey(level: number): string {
  const threshold = RANK_THRESHOLDS.find(t => level >= t.minLevel && level <= t.maxLevel);
  return threshold?.colorKey ?? 'primary';
}
