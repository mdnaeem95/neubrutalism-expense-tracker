import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db, generateId } from '@/db';
import { templates } from '@/db/schema';
import type { Template, PaymentMethod } from '@/types';

const FREE_TEMPLATE_LIMIT = 3;

interface TemplateState {
  templates: Template[];
  isLoading: boolean;
  loadTemplates: () => void;
  addTemplate: (data: {
    name: string;
    amount: number;
    categoryId: string;
    description: string;
    paymentMethod: PaymentMethod;
    notes?: string | null;
  }) => Template;
  deleteTemplate: (id: string) => void;
  canAddTemplate: (isPremium: boolean) => boolean;
  clearAllTemplates: () => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  isLoading: false,

  loadTemplates: () => {
    set({ isLoading: true });
    try {
      const result = db.select().from(templates).all();
      const sorted = (result as Template[]).sort((a, b) => b.createdAt - a.createdAt);
      set({ templates: sorted, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addTemplate: (data) => {
    const now = Date.now();
    const id = generateId();
    const template: Template = {
      id,
      name: data.name,
      amount: data.amount,
      categoryId: data.categoryId,
      description: data.description,
      paymentMethod: data.paymentMethod,
      notes: data.notes ?? null,
      createdAt: now,
    };
    db.insert(templates).values(template).run();
    set((state) => ({ templates: [template, ...state.templates] }));
    return template;
  },

  deleteTemplate: (id) => {
    db.delete(templates).where(eq(templates.id, id)).run();
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
  },

  canAddTemplate: (isPremium) => {
    if (isPremium) return true;
    return get().templates.length < FREE_TEMPLATE_LIMIT;
  },

  clearAllTemplates: () => {
    db.delete(templates).run();
    set({ templates: [] });
  },
}));
