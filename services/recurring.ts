import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { db, generateId } from '@/db';
import { expenses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { RecurringFrequency } from '@/types';

const MAX_INSTANCES_PER_TEMPLATE = 60;

export function advanceDate(timestamp: number, frequency: RecurringFrequency): number {
  const date = new Date(timestamp);
  switch (frequency) {
    case 'daily': return addDays(date, 1).getTime();
    case 'weekly': return addWeeks(date, 1).getTime();
    case 'monthly': return addMonths(date, 1).getTime();
    case 'yearly': return addYears(date, 1).getTime();
  }
}

/**
 * Processes all recurring expense templates and generates any missing instances.
 * Returns the number of new expenses created.
 */
export function processRecurringExpenses(): number {
  const now = Date.now();
  let totalCreated = 0;

  // Find all recurring templates that are due
  const templates = db
    .select()
    .from(expenses)
    .where(eq(expenses.isRecurring, 1))
    .all()
    .filter((e) => e.nextRecurringDate != null && e.nextRecurringDate <= now);

  for (const template of templates) {
    let nextDate = template.nextRecurringDate!;
    const frequency = template.recurringFrequency as RecurringFrequency;
    if (!frequency) continue;

    let created = 0;

    while (nextDate <= now && created < MAX_INSTANCES_PER_TEMPLATE) {
      // Respect end date
      if (template.recurringEndDate && nextDate > template.recurringEndDate) break;

      const instanceNow = Date.now();
      db.insert(expenses)
        .values({
          id: generateId(),
          amount: template.amount,
          categoryId: template.categoryId,
          description: template.description,
          date: nextDate,
          paymentMethod: template.paymentMethod,
          receiptUri: null,
          isRecurring: 0,
          recurringFrequency: null,
          recurringEndDate: null,
          nextRecurringDate: null,
          notes: template.notes,
          createdAt: instanceNow,
          updatedAt: instanceNow,
        })
        .run();

      created++;
      nextDate = advanceDate(nextDate, frequency);
    }

    // Update the template's next date
    db.update(expenses)
      .set({ nextRecurringDate: nextDate, updatedAt: Date.now() })
      .where(eq(expenses.id, template.id))
      .run();

    totalCreated += created;
  }

  return totalCreated;
}
