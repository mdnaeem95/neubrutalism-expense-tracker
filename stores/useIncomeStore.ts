import { create } from 'zustand';
import { eq, desc } from 'drizzle-orm';
import { db, generateId } from '@/db';
import { income } from '@/db/schema';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Income, IncomeSource } from '@/types';

const FREE_MONTHLY_LIMIT = 5;

interface IncomeState {
  incomes: Income[];
  isLoading: boolean;

  loadIncome: () => void;
  addIncome: (data: {
    amount: number;
    source: IncomeSource;
    description: string;
    date: Date;
    notes?: string;
  }) => Income;
  deleteIncome: (id: string) => void;
  clearAllIncome: () => void;

  getMonthlyTotal: (date?: Date) => number;
  getMonthlyCount: (date?: Date) => number;
  canAddIncome: (isPremium: boolean) => boolean;
}

export const useIncomeStore = create<IncomeState>((set, get) => ({
  incomes: [],
  isLoading: false,

  loadIncome: () => {
    set({ isLoading: true });
    try {
      const result = db
        .select()
        .from(income)
        .orderBy(desc(income.date))
        .all();
      set({ incomes: result as Income[], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addIncome: (data) => {
    const now = Date.now();
    const id = generateId();
    const entry: Income = {
      id,
      amount: data.amount,
      source: data.source,
      description: data.description,
      date: data.date.getTime(),
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(income).values(entry).run();
    get().loadIncome();
    return entry;
  },

  deleteIncome: (id) => {
    db.delete(income).where(eq(income.id, id)).run();
    set((state) => ({
      incomes: state.incomes.filter((i) => i.id !== id),
    }));
  },

  clearAllIncome: () => {
    db.delete(income).run();
    set({ incomes: [] });
  },

  getMonthlyTotal: (date?: Date) => {
    const target = date || new Date();
    const start = startOfMonth(target).getTime();
    const end = endOfMonth(target).getTime();
    return get().incomes
      .filter((i) => i.date >= start && i.date <= end)
      .reduce((sum, i) => sum + i.amount, 0);
  },

  getMonthlyCount: (date?: Date) => {
    const target = date || new Date();
    const start = startOfMonth(target).getTime();
    const end = endOfMonth(target).getTime();
    return get().incomes.filter((i) => i.date >= start && i.date <= end).length;
  },

  canAddIncome: (isPremium: boolean) => {
    if (isPremium) return true;
    return get().getMonthlyCount() < FREE_MONTHLY_LIMIT;
  },
}));
