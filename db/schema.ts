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

export const income = sqliteTable('income', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  source: text('source').notNull().default('other'),
  description: text('description').notNull().default(''),
  date: integer('date').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const savingsGoals = sqliteTable('savings_goals', {
  id:            text('id').primaryKey(),
  title:         text('title').notNull(),
  targetAmount:  real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  icon:          text('icon').notNull().default('piggy-bank-outline'),
  color:         text('color').notNull().default('#4ECDC4'),
  targetDate:    integer('target_date'),
  createdAt:     integer('created_at').notNull(),
  updatedAt:     integer('updated_at').notNull(),
});

export const debts = sqliteTable('debts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  totalAmount: real('total_amount').notNull(),
  remainingAmount: real('remaining_amount').notNull(),
  interestRate: real('interest_rate').notNull().default(0),
  minimumPayment: real('minimum_payment').notNull().default(0),
  dueDate: integer('due_date'),
  icon: text('icon').notNull().default('credit-card-outline'),
  color: text('color').notNull().default('#EF4444'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const expenseTags = sqliteTable('expense_tags', {
  expenseId: text('expense_id').notNull().references(() => expenses.id),
  tagId: text('tag_id').notNull().references(() => tags.id),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  description: text('description').notNull().default(''),
  paymentMethod: text('payment_method').notNull().default('cash'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
});
