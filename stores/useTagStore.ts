import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db, generateId } from '@/db';
import { tags, expenseTags } from '@/db/schema';
import type { Tag } from '@/types';

const FREE_TAG_LIMIT = 3;

interface TagState {
  tags: Tag[];
  expenseTagMap: Map<string, Tag[]>;
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

function buildExpenseTagMap(allTags: Tag[]): Map<string, Tag[]> {
  const associations = db.select().from(expenseTags).all() as { expenseId: string; tagId: string }[];
  const tagById = new Map(allTags.map((t) => [t.id, t]));
  const map = new Map<string, Tag[]>();
  for (const assoc of associations) {
    const tag = tagById.get(assoc.tagId);
    if (tag) {
      const existing = map.get(assoc.expenseId);
      if (existing) existing.push(tag);
      else map.set(assoc.expenseId, [tag]);
    }
  }
  return map;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  expenseTagMap: new Map(),
  isLoading: false,

  loadTags: () => {
    set({ isLoading: true });
    try {
      const result = db.select().from(tags).all();
      const sorted = (result as Tag[]).sort((a, b) => b.createdAt - a.createdAt);
      const expenseTagMap = buildExpenseTagMap(sorted);
      set({ tags: sorted, expenseTagMap, isLoading: false });
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
    return get().expenseTagMap.get(expenseId) || [];
  },

  setExpenseTags: (expenseId, tagIds) => {
    db.delete(expenseTags).where(eq(expenseTags.expenseId, expenseId)).run();
    for (const tagId of tagIds) {
      db.insert(expenseTags).values({ expenseId, tagId }).run();
    }
    // Update in-memory map
    const allTags = get().tags;
    const tagById = new Map(allTags.map((t) => [t.id, t]));
    const newTags = tagIds.map((id) => tagById.get(id)).filter(Boolean) as Tag[];
    set((state) => {
      const updated = new Map(state.expenseTagMap);
      updated.set(expenseId, newTags);
      return { expenseTagMap: updated };
    });
  },

  removeExpenseTags: (expenseId) => {
    db.delete(expenseTags).where(eq(expenseTags.expenseId, expenseId)).run();
    set((state) => {
      const updated = new Map(state.expenseTagMap);
      updated.delete(expenseId);
      return { expenseTagMap: updated };
    });
  },

  clearAllTags: () => {
    db.delete(expenseTags).run();
    db.delete(tags).run();
    set({ tags: [], expenseTagMap: new Map() });
  },
}));
