import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db, generateId } from '@/db';
import { categories } from '@/db/schema';
import { DEFAULT_CATEGORIES } from '@/lib/theme';
import type { Category } from '@/types';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  loadCategories: () => void;
  addCategory: (data: { name: string; icon: string; color: string }) => Category;
  updateCategory: (id: string, data: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'budgetAmount' | 'budgetPeriod'>>) => void;
  deleteCategory: (id: string) => void;
  getCategoryById: (id: string) => Category | undefined;
  resetCategories: () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,

  loadCategories: () => {
    set({ isLoading: true });
    try {
      const result = db
        .select()
        .from(categories)
        .orderBy(categories.sortOrder)
        .all();
      set({ categories: result as Category[], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addCategory: (data) => {
    const now = Date.now();
    const id = generateId();
    const sortOrder = get().categories.length;

    db.insert(categories)
      .values({
        id,
        name: data.name,
        icon: data.icon,
        color: data.color,
        isDefault: 0,
        sortOrder,
        createdAt: now,
      })
      .run();

    const newCategory: Category = {
      id,
      ...data,
      budgetAmount: null,
      budgetPeriod: null,
      isDefault: 0,
      sortOrder,
      createdAt: now,
    };

    set((state) => ({ categories: [...state.categories, newCategory] }));
    return newCategory;
  },

  updateCategory: (id, data) => {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.budgetAmount !== undefined) updateData.budgetAmount = data.budgetAmount;
    if (data.budgetPeriod !== undefined) updateData.budgetPeriod = data.budgetPeriod;

    db.update(categories).set(updateData).where(eq(categories.id, id)).run();

    set((state) => ({
      categories: state.categories.map((cat) =>
        cat.id === id ? { ...cat, ...data } : cat
      ),
    }));
  },

  deleteCategory: (id) => {
    db.delete(categories).where(eq(categories.id, id)).run();
    set((state) => ({
      categories: state.categories.filter((cat) => cat.id !== id),
    }));
  },

  getCategoryById: (id) => {
    return get().categories.find((cat) => cat.id === id);
  },

  resetCategories: () => {
    db.delete(categories).run();
    const now = Date.now();
    const newCats: Category[] = [];
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const cat = DEFAULT_CATEGORIES[i];
      const id = generateId();
      db.insert(categories)
        .values({ id, name: cat.name, icon: cat.icon, color: cat.color, isDefault: 1, sortOrder: i, createdAt: now })
        .run();
      newCats.push({ id, name: cat.name, icon: cat.icon, color: cat.color, budgetAmount: null, budgetPeriod: null, isDefault: 1, sortOrder: i, createdAt: now });
    }
    set({ categories: newCats });
  },
}));
