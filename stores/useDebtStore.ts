import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db, generateId } from '@/db';
import { debts } from '@/db/schema';
import type { Debt } from '@/types';

const FREE_DEBT_LIMIT = 1;

interface DebtState {
  debts: Debt[];
  isLoading: boolean;
  loadDebts: () => void;
  addDebt: (data: {
    name: string;
    totalAmount: number;
    remainingAmount: number;
    interestRate: number;
    minimumPayment: number;
    dueDate?: number | null;
    icon: string;
    color: string;
  }) => void;
  updateDebt: (id: string, data: Partial<Pick<Debt, 'name' | 'totalAmount' | 'remainingAmount' | 'interestRate' | 'minimumPayment' | 'dueDate' | 'icon' | 'color'>>) => void;
  makePayment: (id: string, amount: number) => void;
  deleteDebt: (id: string) => void;
  clearAllDebts: () => void;
  canAddDebt: (isPremium: boolean) => boolean;
  getTotalDebt: () => number;
  getMonthsToPayoff: (debt: Debt) => number | null;
}

export const useDebtStore = create<DebtState>((set, get) => ({
  debts: [],
  isLoading: false,

  loadDebts: () => {
    set({ isLoading: true });
    try {
      const result = db.select().from(debts).all();
      const sorted = (result as Debt[]).sort((a, b) => b.createdAt - a.createdAt);
      set({ debts: sorted, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addDebt: (data) => {
    const now = Date.now();
    const id = generateId();
    const debt: Debt = {
      id,
      name: data.name,
      totalAmount: data.totalAmount,
      remainingAmount: data.remainingAmount,
      interestRate: data.interestRate,
      minimumPayment: data.minimumPayment,
      dueDate: data.dueDate ?? null,
      icon: data.icon,
      color: data.color,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(debts).values(debt).run();
    set((state) => ({ debts: [debt, ...state.debts] }));
  },

  updateDebt: (id, data) => {
    const now = Date.now();
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.remainingAmount !== undefined) updateData.remainingAmount = data.remainingAmount;
    if (data.interestRate !== undefined) updateData.interestRate = data.interestRate;
    if (data.minimumPayment !== undefined) updateData.minimumPayment = data.minimumPayment;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;

    db.update(debts).set(updateData).where(eq(debts.id, id)).run();
    set((state) => ({
      debts: state.debts.map((d) => (d.id === id ? { ...d, ...data, updatedAt: now } : d)),
    }));
  },

  makePayment: (id, amount) => {
    const debt = get().debts.find((d) => d.id === id);
    if (!debt) return;
    const newRemaining = Math.max(debt.remainingAmount - amount, 0);
    const now = Date.now();
    db.update(debts).set({ remainingAmount: newRemaining, updatedAt: now }).where(eq(debts.id, id)).run();
    set((state) => ({
      debts: state.debts.map((d) => (d.id === id ? { ...d, remainingAmount: newRemaining, updatedAt: now } : d)),
    }));
  },

  deleteDebt: (id) => {
    db.delete(debts).where(eq(debts.id, id)).run();
    set((state) => ({ debts: state.debts.filter((d) => d.id !== id) }));
  },

  clearAllDebts: () => {
    db.delete(debts).run();
    set({ debts: [] });
  },

  canAddDebt: (isPremium) => {
    if (isPremium) return true;
    return get().debts.length < FREE_DEBT_LIMIT;
  },

  getTotalDebt: () => get().debts.reduce((sum, d) => sum + d.remainingAmount, 0),

  getMonthsToPayoff: (debt) => {
    if (debt.remainingAmount <= 0) return 0;
    if (debt.minimumPayment <= 0) return null;

    const monthlyRate = debt.interestRate / 100 / 12;
    if (monthlyRate === 0) {
      return Math.ceil(debt.remainingAmount / debt.minimumPayment);
    }

    // Standard amortization formula: n = -log(1 - (r * P) / M) / log(1 + r)
    const rP = monthlyRate * debt.remainingAmount;
    if (debt.minimumPayment <= rP) return null; // Payment doesn't cover interest
    const months = -Math.log(1 - rP / debt.minimumPayment) / Math.log(1 + monthlyRate);
    return Math.ceil(months);
  },
}));
