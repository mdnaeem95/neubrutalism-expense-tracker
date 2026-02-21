import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as Crypto from 'expo-crypto';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import * as schema from './schema';
import { DEFAULT_CATEGORIES } from '@/lib/theme';

const sqlite = SQLite.openDatabaseSync('expense-tracker.db');

// Enable WAL mode for better performance
sqlite.execSync('PRAGMA journal_mode = WAL;');

export const db = drizzle(sqlite, { schema });

export function generateId(): string {
  return Crypto.randomUUID();
}

export async function initializeDatabase() {
  // Create tables
  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      budget_amount REAL,
      budget_period TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      description TEXT NOT NULL DEFAULT '',
      date INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      receipt_uri TEXT,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurring_frequency TEXT,
      recurring_end_date INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT REFERENCES categories(id),
      amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      start_date INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);

    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      source TEXT NOT NULL DEFAULT 'other',
      description TEXT NOT NULL DEFAULT '',
      date INTEGER NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      icon TEXT NOT NULL DEFAULT 'piggy-bank-outline',
      color TEXT NOT NULL DEFAULT '#4ECDC4',
      target_date INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Migration: add next_recurring_date column
  try {
    sqlite.execSync('ALTER TABLE expenses ADD COLUMN next_recurring_date INTEGER;');
  } catch {
    // Column already exists — ignore
  }

  // Backfill nextRecurringDate for existing recurring expenses
  backfillRecurringDates();

  // Seed default categories if none exist
  const existingCategories = db.select().from(schema.categories).all();

  if (existingCategories.length === 0) {
    const now = Date.now();
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const cat = DEFAULT_CATEGORIES[i];
      db.insert(schema.categories)
        .values({
          id: generateId(),
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          isDefault: 1,
          sortOrder: i,
          createdAt: now,
        })
        .run();
    }
  } else {
    // Migrate emoji icons to Ionicon names for existing categories
    migrateEmojiIcons();
  }
}

const EMOJI_TO_ICON: Record<string, string> = {
  '🍔': 'food-fork-drink',
  '🚗': 'car',
  '🛍️': 'shopping',
  '🛍': 'shopping',
  '🎬': 'filmstrip',
  '💡': 'flash',
  '❤️': 'heart-outline',
  '❤': 'heart-outline',
  '📚': 'book-open-variant',
  '📦': 'cube-outline',
  '🏠': 'home-outline',
  '✈️': 'airplane',
  '✈': 'airplane',
  '🎮': 'gamepad-variant-outline',
  '💼': 'briefcase-outline',
  '🎵': 'music-note',
  '🐶': 'paw',
  '💪': 'dumbbell',
  '☕': 'coffee-outline',
};

// Ionicons → MaterialCommunityIcons name mapping for DB migration
const IONICON_TO_MCI: Record<string, string> = {
  'restaurant-outline': 'food-fork-drink',
  'bag-outline': 'shopping',
  'film-outline': 'filmstrip',
  'car-outline': 'car',
  'flash-outline': 'flash',
  'book-outline': 'book-open-variant',
  'airplane-outline': 'airplane',
  'game-controller-outline': 'gamepad-variant-outline',
  'musical-notes-outline': 'music-note',
  'paw-outline': 'paw',
  'barbell-outline': 'dumbbell',
  'cafe-outline': 'coffee-outline',
  'briefcase-outline': 'briefcase-outline',
};

function migrateEmojiIcons() {
  const categories = db.select().from(schema.categories).all();
  for (const cat of categories) {
    // First try emoji → MCI
    const fromEmoji = EMOJI_TO_ICON[cat.icon];
    if (fromEmoji) {
      sqlite.runSync(
        'UPDATE categories SET icon = ? WHERE id = ?',
        [fromEmoji, cat.id]
      );
      continue;
    }
    // Then try old Ionicons → MCI
    const fromIonicon = IONICON_TO_MCI[cat.icon];
    if (fromIonicon) {
      sqlite.runSync(
        'UPDATE categories SET icon = ? WHERE id = ?',
        [fromIonicon, cat.id]
      );
    }
  }
}

function backfillRecurringDates() {
  const rows = sqlite.getAllSync(
    'SELECT id, date, recurring_frequency FROM expenses WHERE is_recurring = 1 AND next_recurring_date IS NULL AND recurring_frequency IS NOT NULL'
  ) as { id: string; date: number; recurring_frequency: string }[];

  const now = Date.now();
  for (const row of rows) {
    let next = row.date;
    // Advance until next occurrence is in the future
    while (next <= now) {
      const d = new Date(next);
      switch (row.recurring_frequency) {
        case 'daily': next = addDays(d, 1).getTime(); break;
        case 'weekly': next = addWeeks(d, 1).getTime(); break;
        case 'monthly': next = addMonths(d, 1).getTime(); break;
        case 'yearly': next = addYears(d, 1).getTime(); break;
        default: next = now + 1; break; // Unknown frequency — skip
      }
    }
    sqlite.runSync(
      'UPDATE expenses SET next_recurring_date = ? WHERE id = ?',
      [next, row.id]
    );
  }
}
