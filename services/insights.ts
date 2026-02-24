import { startOfMonth, endOfMonth, subMonths, format, getDaysInMonth, getDate } from 'date-fns';
import type { ExpenseWithCategory, Insight, BudgetWithProgress } from '@/types';

export function generateInsights(
  expenses: ExpenseWithCategory[],
  budgets: BudgetWithProgress[],
  monthlyIncome: number,
  lastMonthIncome: number,
  streak: number,
  totalExpenseCount: number,
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const thisMonthStart = startOfMonth(now).getTime();
  const thisMonthEnd = endOfMonth(now).getTime();
  const lastMonthStart = startOfMonth(subMonths(now, 1)).getTime();
  const lastMonthEnd = endOfMonth(subMonths(now, 1)).getTime();

  const thisMonthExpenses = expenses.filter((e) => e.date >= thisMonthStart && e.date <= thisMonthEnd);
  const lastMonthExpenses = expenses.filter((e) => e.date >= lastMonthStart && e.date <= lastMonthEnd);

  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 1. Category spending spike/drop
  const thisCategoryTotals = getCategoryTotals(thisMonthExpenses);
  const lastCategoryTotals = getCategoryTotals(lastMonthExpenses);

  for (const [catId, thisTotal] of Object.entries(thisCategoryTotals)) {
    const lastTotal = lastCategoryTotals[catId] ?? 0;
    if (lastTotal === 0) continue;
    const change = ((thisTotal - lastTotal) / lastTotal) * 100;
    const catName = thisMonthExpenses.find((e) => e.categoryId === catId)?.category.name ?? 'Unknown';

    if (change > 20) {
      insights.push({
        id: `spike_${catId}`,
        type: 'spending_increase',
        title: `${catName} Spending Up`,
        message: `You've spent ${change.toFixed(0)}% more on ${catName} this month compared to last.`,
        icon: 'trending-up',
        color: '#EF4444',
        priority: 8,
      });
    } else if (change < -20) {
      insights.push({
        id: `drop_${catId}`,
        type: 'spending_decrease',
        title: `${catName} Spending Down`,
        message: `Great job! ${catName} spending is down ${Math.abs(change).toFixed(0)}% from last month.`,
        icon: 'trending-down',
        color: '#6BCB77',
        priority: 6,
      });
    }
  }

  // 2. Budget projection
  const dayOfMonth = getDate(now);
  const daysInMonth = getDaysInMonth(now);
  if (dayOfMonth >= 5 && thisMonthTotal > 0) {
    const dailyAvg = thisMonthTotal / dayOfMonth;
    const projected = thisMonthTotal + dailyAvg * (daysInMonth - dayOfMonth);
    const overallBudget = budgets.find((b) => !b.categoryName);
    if (overallBudget && projected > overallBudget.amount) {
      const overBy = projected - overallBudget.amount;
      insights.push({
        id: 'budget_projection',
        type: 'budget_projection',
        title: 'Budget Alert',
        message: `At this pace, you'll exceed your budget by $${overBy.toFixed(0)} this month.`,
        icon: 'alert-circle-outline',
        color: '#EF4444',
        priority: 9,
      });
    }
  }

  // 3. Biggest expense today
  const todayStr = format(now, 'yyyy-MM-dd');
  const todayExpenses = expenses.filter((e) => format(new Date(e.date), 'yyyy-MM-dd') === todayStr);
  if (todayExpenses.length > 0) {
    const biggest = todayExpenses.reduce((max, e) => (e.amount > max.amount ? e : max), todayExpenses[0]);
    if (biggest.amount > 0) {
      insights.push({
        id: 'biggest_today',
        type: 'biggest_expense',
        title: 'Biggest Today',
        message: `Your largest expense today: $${biggest.amount.toFixed(2)} on ${biggest.category.name}.`,
        icon: 'cash',
        color: '#4D96FF',
        priority: 4,
      });
    }
  }

  // 4. Monthly savings comparison
  if (lastMonthTotal > 0 && thisMonthTotal < lastMonthTotal && dayOfMonth >= 15) {
    const saved = lastMonthTotal - thisMonthTotal;
    insights.push({
      id: 'savings_compare',
      type: 'savings_comparison',
      title: 'Spending Down',
      message: `You've spent $${saved.toFixed(0)} less than this time last month. Keep it up!`,
      icon: 'piggy-bank-outline',
      color: '#6BCB77',
      priority: 7,
    });
  }

  // 5. Streak milestones
  const milestones = [7, 14, 30, 60, 90];
  for (const m of milestones) {
    if (streak === m) {
      insights.push({
        id: `streak_${m}`,
        type: 'streak_milestone',
        title: `${m}-Day Streak!`,
        message: `You've logged expenses for ${m} days straight. Amazing discipline!`,
        icon: 'fire',
        color: '#FB923C',
        priority: 5,
      });
      break;
    }
  }

  // Sort by priority descending, return top 2
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 2);
}

function getCategoryTotals(expenses: ExpenseWithCategory[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    totals[e.categoryId] = (totals[e.categoryId] ?? 0) + e.amount;
  }
  return totals;
}
