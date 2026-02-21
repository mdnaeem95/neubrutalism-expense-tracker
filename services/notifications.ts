import * as Notifications from 'expo-notifications';
import { db } from '@/db';
import { expenses, budgets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subDays } from 'date-fns';
import type { BudgetPeriod } from '@/types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// --- Budget Alerts ---

function getBudgetPeriodRange(period: BudgetPeriod): { start: number; end: number } {
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

export async function scheduleBudgetAlerts() {
  // Cancel existing budget alerts first
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'budget_alert') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  const allBudgets = db.select().from(budgets).all();
  const allExpenses = db.select().from(expenses).all();

  for (const budget of allBudgets) {
    const period = budget.period as BudgetPeriod;
    const { start, end } = getBudgetPeriodRange(period);

    const spent = allExpenses
      .filter((e) => {
        if (budget.categoryId && e.categoryId !== budget.categoryId) return false;
        return e.date >= start && e.date <= end;
      })
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);

    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    // Alert at 80% threshold
    if (percentage >= 80 && percentage < 100) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Budget Warning',
          body: `You've spent ${percentage.toFixed(0)}% of your ${budget.categoryId ? '' : 'overall '}budget.`,
          data: { type: 'budget_alert', budgetId: budget.id },
        },
        trigger: null, // Immediate
      });
    }

    // Alert at 100% threshold
    if (percentage >= 100) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Budget Exceeded',
          body: `You've exceeded your ${budget.categoryId ? '' : 'overall '}budget by ${(percentage - 100).toFixed(0)}%.`,
          data: { type: 'budget_alert', budgetId: budget.id },
        },
        trigger: null,
      });
    }
  }
}

// --- Recurring Expense Reminders ---

export async function scheduleRecurringReminders() {
  // Cancel existing recurring reminders first
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'recurring_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  // Find all recurring templates with upcoming dates
  const templates = db
    .select()
    .from(expenses)
    .where(eq(expenses.isRecurring, 1))
    .all()
    .filter((e) => e.nextRecurringDate != null);

  const now = Date.now();

  for (const template of templates) {
    const nextDate = template.nextRecurringDate!;
    // Schedule reminder 1 day before the next occurrence
    const reminderDate = subDays(new Date(nextDate), 1);

    if (reminderDate.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Recurring Expense',
          body: `${template.description || 'Recurring expense'} of $${template.amount.toFixed(2)} is due tomorrow.`,
          data: { type: 'recurring_reminder', expenseId: template.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
      });
    }
  }
}

// --- Daily Log Reminder ---

export async function scheduleDailyReminder(streak: number = 0) {
  // Cancel existing daily reminder before rescheduling
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'daily_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  const body =
    streak > 1
      ? `Don't break your ${streak}-day streak! Log today's expenses.`
      : streak === 1
      ? "Don't break your streak! Log today's expenses."
      : 'Have you logged your expenses today?';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Ledgr Reminder',
      body,
      data: { type: 'daily_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function cancelDailyReminder() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'daily_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

export async function refreshNotifications(
  notificationsEnabled: boolean,
  budgetAlerts: boolean,
  dailyReminderEnabled: boolean = false,
  streak: number = 0,
) {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  if (notificationsEnabled) {
    await scheduleRecurringReminders();
  }

  if (budgetAlerts) {
    await scheduleBudgetAlerts();
  }

  if (dailyReminderEnabled) {
    await scheduleDailyReminder(streak);
  } else {
    await cancelDailyReminder();
  }

  if (!notificationsEnabled && !budgetAlerts && !dailyReminderEnabled) {
    await cancelAllNotifications();
  }
}
