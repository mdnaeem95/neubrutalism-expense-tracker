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
  mascotEnabled: boolean;
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

// Piggy Bank Mascot
export type PiggyMood = 'happy' | 'excited' | 'proud' | 'worried' | 'sleeping' | 'encouraging';
export type PiggySize = 'small' | 'medium' | 'large';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
}

export interface GamificationData {
  streak: StreakData;
  totalExpenseCount: number;
  shownMilestones: number[];
}

export const MILESTONE_THRESHOLDS = [1, 10, 25, 50, 100, 250, 500, 1000] as const;
