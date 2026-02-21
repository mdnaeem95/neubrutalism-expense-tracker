import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db, generateId } from '@/db';
import { savingsGoals } from '@/db/schema';
import type { SavingsGoal } from '@/types';

const FREE_GOAL_LIMIT = 1;

interface SavingsGoalState {
  goals: SavingsGoal[];
  isLoading: boolean;
  loadGoals: () => void;
  addGoal: (data: { title: string; targetAmount: number; icon: string; color: string; targetDate?: number | null }) => void;
  updateGoal: (id: string, data: Partial<Pick<SavingsGoal, 'title' | 'targetAmount' | 'icon' | 'color' | 'targetDate'>>) => void;
  contributeToGoal: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;
  clearAllGoals: () => void;
  canAddGoal: (isPremium: boolean) => boolean;
  getActiveGoals: () => SavingsGoal[];
  getCompletedGoals: () => SavingsGoal[];
}

export const useSavingsGoalStore = create<SavingsGoalState>((set, get) => ({
  goals: [],
  isLoading: false,

  loadGoals: () => {
    set({ isLoading: true });
    try {
      const result = db.select().from(savingsGoals).all();
      const sorted = (result as SavingsGoal[]).sort((a, b) => b.createdAt - a.createdAt);
      set({ goals: sorted, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addGoal: (data) => {
    const now = Date.now();
    const id = generateId();
    const goal: SavingsGoal = {
      id,
      title: data.title,
      targetAmount: data.targetAmount,
      currentAmount: 0,
      icon: data.icon,
      color: data.color,
      targetDate: data.targetDate ?? null,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(savingsGoals).values(goal).run();
    set((state) => ({ goals: [goal, ...state.goals] }));
  },

  updateGoal: (id, data) => {
    const now = Date.now();
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.targetDate !== undefined) updateData.targetDate = data.targetDate;

    db.update(savingsGoals).set(updateData).where(eq(savingsGoals.id, id)).run();
    set((state) => ({
      goals: state.goals.map((g) => g.id === id ? { ...g, ...data, updatedAt: now } : g),
    }));
  },

  contributeToGoal: (id, amount) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;
    const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
    const now = Date.now();
    db.update(savingsGoals).set({ currentAmount: newAmount, updatedAt: now }).where(eq(savingsGoals.id, id)).run();
    set((state) => ({
      goals: state.goals.map((g) => g.id === id ? { ...g, currentAmount: newAmount, updatedAt: now } : g),
    }));
  },

  deleteGoal: (id) => {
    db.delete(savingsGoals).where(eq(savingsGoals.id, id)).run();
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
  },

  clearAllGoals: () => {
    db.delete(savingsGoals).run();
    set({ goals: [] });
  },

  canAddGoal: (isPremium) => {
    if (isPremium) return true;
    const activeCount = get().goals.filter((g) => g.currentAmount < g.targetAmount).length;
    return activeCount < FREE_GOAL_LIMIT;
  },

  getActiveGoals: () => get().goals.filter((g) => g.currentAmount < g.targetAmount),
  getCompletedGoals: () => get().goals.filter((g) => g.currentAmount >= g.targetAmount),
}));
