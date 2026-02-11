import { create } from 'zustand';
import { eq, desc, and, gte, lte, like } from 'drizzle-orm';
import { db, generateId } from '@/db';
import { expenses, categories } from '@/db/schema';
import type { Expense, ExpenseWithCategory, PaymentMethod, RecurringFrequency, DateFilter } from '@/types';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths,
} from 'date-fns';
import { advanceDate } from '@/services/recurring';

interface ExpenseFilters {
  dateFilter: DateFilter;
  categoryId: string | null;
  paymentMethod: PaymentMethod | null;
  searchQuery: string;
  customStartDate: Date | null;
  customEndDate: Date | null;
}

interface ExpenseState {
  expenses: ExpenseWithCategory[];
  isLoading: boolean;
  filters: ExpenseFilters;
  addExpenseCount: number;

  loadExpenses: () => void;
  addExpense: (data: {
    amount: number;
    categoryId: string;
    description: string;
    date: Date;
    paymentMethod: PaymentMethod;
    isRecurring?: boolean;
    recurringFrequency?: RecurringFrequency;
    notes?: string;
    receiptUri?: string;
  }) => Expense;
  updateExpense: (id: string, data: Partial<{
    amount: number;
    categoryId: string;
    description: string;
    date: Date;
    paymentMethod: PaymentMethod;
    isRecurring: boolean;
    recurringFrequency: RecurringFrequency | null;
    notes: string | null;
    receiptUri: string | null;
  }>) => void;
  deleteExpense: (id: string) => void;
  setFilter: <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) => void;
  resetFilters: () => void;
  getFilteredExpenses: () => ExpenseWithCategory[];
  getMonthlyTotal: (date?: Date) => number;
  getExpenseById: (id: string) => ExpenseWithCategory | undefined;
  incrementAddCount: () => boolean; // returns true if should show interstitial
  clearAllExpenses: () => void;
}

const DEFAULT_FILTERS: ExpenseFilters = {
  dateFilter: 'month',
  categoryId: null,
  paymentMethod: null,
  searchQuery: '',
  customStartDate: null,
  customEndDate: null,
};

function getDateRange(filter: DateFilter, customStart?: Date | null, customEnd?: Date | null): { start: number; end: number } {
  const now = new Date();
  switch (filter) {
    case 'today':
      return { start: startOfDay(now).getTime(), end: endOfDay(now).getTime() };
    case 'week':
      return { start: startOfWeek(now).getTime(), end: endOfWeek(now).getTime() };
    case 'month':
      return { start: startOfMonth(now).getTime(), end: endOfMonth(now).getTime() };
    case 'year':
      return { start: startOfYear(now).getTime(), end: endOfYear(now).getTime() };
    case 'custom':
      return {
        start: customStart ? startOfDay(customStart).getTime() : startOfMonth(now).getTime(),
        end: customEnd ? endOfDay(customEnd).getTime() : endOfMonth(now).getTime(),
      };
  }
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  isLoading: false,
  filters: DEFAULT_FILTERS,
  addExpenseCount: 0,

  loadExpenses: () => {
    set({ isLoading: true });
    try {
      const result = db
        .select({
          id: expenses.id,
          amount: expenses.amount,
          categoryId: expenses.categoryId,
          description: expenses.description,
          date: expenses.date,
          paymentMethod: expenses.paymentMethod,
          receiptUri: expenses.receiptUri,
          isRecurring: expenses.isRecurring,
          recurringFrequency: expenses.recurringFrequency,
          recurringEndDate: expenses.recurringEndDate,
          nextRecurringDate: expenses.nextRecurringDate,
          notes: expenses.notes,
          createdAt: expenses.createdAt,
          updatedAt: expenses.updatedAt,
          category: {
            id: categories.id,
            name: categories.name,
            icon: categories.icon,
            color: categories.color,
            budgetAmount: categories.budgetAmount,
            budgetPeriod: categories.budgetPeriod,
            isDefault: categories.isDefault,
            sortOrder: categories.sortOrder,
            createdAt: categories.createdAt,
          },
        })
        .from(expenses)
        .innerJoin(categories, eq(expenses.categoryId, categories.id))
        .orderBy(desc(expenses.date))
        .all();

      set({ expenses: result as ExpenseWithCategory[], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addExpense: (data) => {
    const now = Date.now();
    const id = generateId();

    const dateMs = data.date.getTime();
    const expense: Expense = {
      id,
      amount: data.amount,
      categoryId: data.categoryId,
      description: data.description,
      date: dateMs,
      paymentMethod: data.paymentMethod,
      receiptUri: data.receiptUri || null,
      isRecurring: data.isRecurring ? 1 : 0,
      recurringFrequency: data.recurringFrequency || null,
      recurringEndDate: null,
      nextRecurringDate: data.isRecurring && data.recurringFrequency
        ? advanceDate(dateMs, data.recurringFrequency)
        : null,
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(expenses).values(expense).run();
    get().loadExpenses();

    return expense;
  },

  updateExpense: (id, data) => {
    const updateData: Record<string, unknown> = { updatedAt: Date.now() };
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = data.date.getTime();
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring ? 1 : 0;
    if (data.recurringFrequency !== undefined) updateData.recurringFrequency = data.recurringFrequency;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.receiptUri !== undefined) updateData.receiptUri = data.receiptUri;

    db.update(expenses).set(updateData).where(eq(expenses.id, id)).run();
    get().loadExpenses();
  },

  deleteExpense: (id) => {
    db.delete(expenses).where(eq(expenses.id, id)).run();
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    }));
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }));
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS });
  },

  getFilteredExpenses: () => {
    const { expenses: allExpenses, filters } = get();
    const { start, end } = getDateRange(filters.dateFilter, filters.customStartDate, filters.customEndDate);

    return allExpenses.filter((expense) => {
      if (expense.date < start || expense.date > end) return false;
      if (filters.categoryId && expense.categoryId !== filters.categoryId) return false;
      if (filters.paymentMethod && expense.paymentMethod !== filters.paymentMethod) return false;
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          expense.description.toLowerCase().includes(query) ||
          expense.category.name.toLowerCase().includes(query) ||
          expense.notes?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  },

  getMonthlyTotal: (date?: Date) => {
    const target = date || new Date();
    const start = startOfMonth(target).getTime();
    const end = endOfMonth(target).getTime();
    return get().expenses
      .filter((e) => e.date >= start && e.date <= end)
      .reduce((sum, e) => sum + e.amount, 0);
  },

  getExpenseById: (id) => {
    return get().expenses.find((e) => e.id === id);
  },

  incrementAddCount: () => {
    const count = get().addExpenseCount + 1;
    set({ addExpenseCount: count });
    return count % 5 === 0; // Show interstitial every 5 additions
  },

  clearAllExpenses: () => {
    db.delete(expenses).run();
    set({ expenses: [], addExpenseCount: 0 });
  },
}));
