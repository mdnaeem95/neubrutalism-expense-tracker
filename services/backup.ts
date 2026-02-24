import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import { Paths, File } from 'expo-file-system';
import { format } from 'date-fns';
import { db } from '@/db';
import {
  categories,
  expenses,
  budgets,
  income,
  savingsGoals,
  debts,
  tags,
  expenseTags,
  templates,
} from '@/db/schema';
import type { BackupData } from '@/types';

const BACKUP_VERSION = '1.3.0';

// ─── Export ────────────────────────────────────────────────────────────────────

export function exportBackup(): BackupData {
  const allCategories = db.select().from(categories).all();
  const allExpenses = db.select().from(expenses).all();
  const allBudgets = db.select().from(budgets).all();
  const allIncome = db.select().from(income).all();
  const allSavingsGoals = db.select().from(savingsGoals).all();
  const allDebts = db.select().from(debts).all();
  const allTags = db.select().from(tags).all();
  const allExpenseTags = db.select().from(expenseTags).all();
  const allTemplates = db.select().from(templates).all();

  // AsyncStorage reads are async — we snapshot them synchronously here by
  // reading from the in-memory Zustand stores via AsyncStorage at call-time.
  // The actual async reads happen in shareBackup / importBackup which are async.
  return {
    version: BACKUP_VERSION,
    timestamp: Date.now(),
    categories: allCategories,
    expenses: allExpenses,
    budgets: allBudgets,
    income: allIncome,
    savingsGoals: allSavingsGoals,
    debts: allDebts,
    tags: allTags,
    expenseTags: allExpenseTags,
    templates: allTemplates,
    settings: null,      // populated in shareBackup (async)
    gamification: null,  // populated in shareBackup (async)
    achievements: null,  // populated in shareBackup (async)
  };
}

async function buildFullBackup(): Promise<BackupData> {
  const base = exportBackup();

  const [settingsRaw, gamificationRaw] = await Promise.all([
    AsyncStorage.getItem('app_settings'),
    AsyncStorage.getItem('gamification_data'),
  ]);

  return {
    ...base,
    settings: settingsRaw ? JSON.parse(settingsRaw) : null,
    gamification: gamificationRaw ? JSON.parse(gamificationRaw) : null,
    achievements: null, // reserved for future use
  };
}

// ─── Import ────────────────────────────────────────────────────────────────────

export async function importBackup(data: BackupData): Promise<void> {
  try {
    if (!data.version) {
      throw new Error('Invalid backup: missing version field.');
    }

    // Delete in dependency order (junction table first, then dependents, then
    // parent tables last because categories is referenced by expenses, budgets,
    // templates).
    db.delete(expenseTags).run();
    db.delete(expenses).run();
    db.delete(budgets).run();
    db.delete(income).run();
    db.delete(savingsGoals).run();
    db.delete(debts).run();
    db.delete(templates).run();
    db.delete(tags).run();
    db.delete(categories).run();

    // Re-insert all rows
    if (data.categories?.length) {
      for (const row of data.categories) {
        db.insert(categories).values(row).run();
      }
    }

    if (data.expenses?.length) {
      for (const row of data.expenses) {
        db.insert(expenses).values(row).run();
      }
    }

    if (data.budgets?.length) {
      for (const row of data.budgets) {
        db.insert(budgets).values(row).run();
      }
    }

    if (data.income?.length) {
      for (const row of data.income) {
        db.insert(income).values(row).run();
      }
    }

    if (data.savingsGoals?.length) {
      for (const row of data.savingsGoals) {
        db.insert(savingsGoals).values(row).run();
      }
    }

    if (data.debts?.length) {
      for (const row of data.debts) {
        db.insert(debts).values(row).run();
      }
    }

    if (data.tags?.length) {
      for (const row of data.tags) {
        db.insert(tags).values(row).run();
      }
    }

    if (data.expenseTags?.length) {
      for (const row of data.expenseTags) {
        db.insert(expenseTags).values(row).run();
      }
    }

    if (data.templates?.length) {
      for (const row of data.templates) {
        db.insert(templates).values(row).run();
      }
    }

    // Restore AsyncStorage keys
    if (data.settings) {
      await AsyncStorage.setItem('app_settings', JSON.stringify(data.settings));
    }

    if (data.gamification) {
      await AsyncStorage.setItem('gamification_data', JSON.stringify(data.gamification));
    }
  } catch (err) {
    console.error('[backup] importBackup failed:', err);
    throw err;
  }
}

// ─── Share ─────────────────────────────────────────────────────────────────────

export async function shareBackup(): Promise<void> {
  const data = await buildFullBackup();
  const json = JSON.stringify(data, null, 2);

  const fileName = `ledgr-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  const file = new File(Paths.document, fileName);
  await file.write(json);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save Ledgr Backup',
    UTI: 'public.json',
  });
}

// ─── Parse ─────────────────────────────────────────────────────────────────────

export async function parseBackupFile(uri: string): Promise<BackupData> {
  const file = new File(uri);
  const content = await file.text();

  const parsed = JSON.parse(content) as BackupData;

  if (!parsed.version || !parsed.timestamp) {
    throw new Error('Invalid backup file: missing required fields.');
  }

  return parsed;
}
