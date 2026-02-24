import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db, generateId } from '@/db';
import { tags, expenseTags } from '@/db/schema';
import type { Tag } from '@/types';

const FREE_TAG_LIMIT = 3;

interface TagState {
  tags: Tag[];
  isLoading: boolean;
  loadTags: () => void;
  addTag: (data: { name: string; color: string }) => Tag;
  updateTag: (id: string, data: Partial<Pick<Tag, 'name' | 'color'>>) => void;
  deleteTag: (id: string) => void;
  canAddTag: (isPremium: boolean) => boolean;
  getTagsForExpense: (expenseId: string) => Tag[];
  setExpenseTags: (expenseId: string, tagIds: string[]) => void;
  removeExpenseTags: (expenseId: string) => void;
  clearAllTags: () => void;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  isLoading: false,

  loadTags: () => {
    set({ isLoading: true });
    try {
      const result = db.select().from(tags).all();
      const sorted = (result as Tag[]).sort((a, b) => b.createdAt - a.createdAt);
      set({ tags: sorted, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addTag: (data) => {
    const now = Date.now();
    const id = generateId();
    const tag: Tag = {
      id,
      name: data.name,
      color: data.color,
      createdAt: now,
    };
    db.insert(tags).values(tag).run();
    set((state) => ({ tags: [tag, ...state.tags] }));
    return tag;
  },

  updateTag: (id, data) => {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;

    db.update(tags).set(updateData).where(eq(tags.id, id)).run();
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
  },

  deleteTag: (id) => {
    // Remove all expense-tag associations first
    db.delete(expenseTags).where(eq(expenseTags.tagId, id)).run();
    db.delete(tags).where(eq(tags.id, id)).run();
    set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }));
  },

  canAddTag: (isPremium) => {
    if (isPremium) return true;
    return get().tags.length < FREE_TAG_LIMIT;
  },

  getTagsForExpense: (expenseId) => {
    const associations = db
      .select()
      .from(expenseTags)
      .where(eq(expenseTags.expenseId, expenseId))
      .all();
    const tagIds = new Set(associations.map((a: any) => a.tagId));
    return get().tags.filter((t) => tagIds.has(t.id));
  },

  setExpenseTags: (expenseId, tagIds) => {
    // Remove existing associations
    db.delete(expenseTags).where(eq(expenseTags.expenseId, expenseId)).run();
    // Insert new associations
    for (const tagId of tagIds) {
      db.insert(expenseTags).values({ expenseId, tagId }).run();
    }
  },

  removeExpenseTags: (expenseId) => {
    db.delete(expenseTags).where(eq(expenseTags.expenseId, expenseId)).run();
  },

  clearAllTags: () => {
    db.delete(expenseTags).run();
    db.delete(tags).run();
    set({ tags: [] });
  },
}));
