import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db, generateId } from '@/db';
import { budgets } from '@/db/schema';
import type { Budget, BudgetPeriod, BudgetWithProgress } from '@/types';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  loadBudgets: () => void;
  addBudget: (data: { categoryId: string | null; amount: number; period: BudgetPeriod }) => void;
  updateBudget: (id: string, data: { amount?: number; period?: BudgetPeriod }) => void;
  deleteBudget: (id: string) => void;
  getBudgetsWithProgress: () => BudgetWithProgress[];
  getOverallBudgetProgress: () => { total: number; spent: number; percentage: number } | null;
  clearAllBudgets: () => void;
}

function getPeriodRange(period: BudgetPeriod): { start: number; end: number } {
  const now = new Date();
  switch (period) {
    case 'weekly':
      return { start: startOfWeek(now).getTime(), end: endOfWeek(now).getTime() };
    case 'monthly':
      return { start: startOfMonth(now).getTime(), end: endOfMonth(now).getTime() };
    case 'yearly':
      return { start: startOfYear(now).getTime(), end: endOfYear(now).getTime() };
  }
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  isLoading: false,

  loadBudgets: () => {
    set({ isLoading: true });
    try {
      const result = db.select().from(budgets).all();
      set({ budgets: result as Budget[], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addBudget: (data) => {
    const now = Date.now();
    const id = generateId();
    const budget: Budget = {
      id,
      categoryId: data.categoryId,
      amount: data.amount,
      period: data.period,
      startDate: now,
      createdAt: now,
    };

    db.insert(budgets).values(budget).run();
    set((state) => ({ budgets: [...state.budgets, budget] }));
  },

  updateBudget: (id, data) => {
    const updateData: Record<string, unknown> = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.period !== undefined) updateData.period = data.period;

    db.update(budgets).set(updateData).where(eq(budgets.id, id)).run();
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === id ? { ...b, ...data } : b
      ),
    }));
  },

  deleteBudget: (id) => {
    db.delete(budgets).where(eq(budgets.id, id)).run();
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
    }));
  },

  getBudgetsWithProgress: () => {
    const allBudgets = get().budgets;
    const allExpenses = useExpenseStore.getState().expenses;
    const allCategories = useCategoryStore.getState().categories;

    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    return allBudgets
      .filter((b) => b.categoryId !== null)
      .map((budget) => {
        const { start, end } = getPeriodRange(budget.period as BudgetPeriod);
        const cat = categoryMap.get(budget.categoryId!);

        const spent = allExpenses
          .filter(
            (e) =>
              e.categoryId === budget.categoryId &&
              e.date >= start &&
              e.date <= end
          )
          .reduce((sum, e) => sum + (e.amount ?? 0), 0);

        return {
          ...budget,
          spent,
          remaining: Math.max(0, budget.amount - spent),
          percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
          categoryName: cat?.name,
          categoryIcon: cat?.icon,
          categoryColor: cat?.color,
        } as BudgetWithProgress;
      });
  },

  getOverallBudgetProgress: () => {
    const allBudgets = get().budgets;
    const overallBudget = allBudgets.find((b) => b.categoryId === null);
    if (!overallBudget) return null;

    const { start, end } = getPeriodRange(overallBudget.period as BudgetPeriod);
    const allExpenses = useExpenseStore.getState().expenses;

    const spent = allExpenses
      .filter((e) => e.date >= start && e.date <= end)
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);

    return {
      total: overallBudget.amount,
      spent,
      percentage: overallBudget.amount > 0 ? (spent / overallBudget.amount) * 100 : 0,
    };
  },

  clearAllBudgets: () => {
    db.delete(budgets).run();
    set({ budgets: [] });
  },
}));
