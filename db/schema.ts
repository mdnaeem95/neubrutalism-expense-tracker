import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  budgetAmount: real('budget_amount'),
  budgetPeriod: text('budget_period'),
  isDefault: integer('is_default').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  description: text('description').notNull().default(''),
  date: integer('date').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'),
  receiptUri: text('receipt_uri'),
  isRecurring: integer('is_recurring').notNull().default(0),
  recurringFrequency: text('recurring_frequency'),
  recurringEndDate: integer('recurring_end_date'),
  nextRecurringDate: integer('next_recurring_date'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id),
  amount: real('amount').notNull(),
  period: text('period').notNull().default('monthly'),
  startDate: integer('start_date').notNull(),
  createdAt: integer('created_at').notNull(),
});
