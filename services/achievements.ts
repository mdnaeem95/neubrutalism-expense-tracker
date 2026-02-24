import type { Achievement, AchievementId } from '@/types';

export const ACHIEVEMENTS: Omit<Achievement, 'earned' | 'earnedAt'>[] = [
  // Logging milestones
  { id: 'expense_10', title: 'Getting Started', description: 'Log 10 expenses', icon: 'counter', color: '#6BCB77', threshold: 10 },
  { id: 'expense_50', title: 'Halfway There', description: 'Log 50 expenses', icon: 'chart-line', color: '#4D96FF', threshold: 50 },
  { id: 'expense_100', title: 'Centurion', description: 'Log 100 expenses', icon: 'trophy-outline', color: '#FFD93D', threshold: 100 },
  { id: 'expense_500', title: 'Expense Master', description: 'Log 500 expenses', icon: 'crown-outline', color: '#A855F7', threshold: 500 },

  // Streak milestones
  { id: 'streak_7', title: 'Week Warrior', description: '7-day logging streak', icon: 'fire', color: '#FB923C', threshold: 7 },
  { id: 'streak_14', title: 'Fortnight Fighter', description: '14-day streak', icon: 'fire', color: '#EF4444', threshold: 14 },
  { id: 'streak_30', title: 'Monthly Maven', description: '30-day streak', icon: 'fire', color: '#FF6B9D', threshold: 30 },
  { id: 'streak_60', title: 'Two Month Titan', description: '60-day streak', icon: 'fire', color: '#A855F7', threshold: 60 },
  { id: 'streak_90', title: 'Quarter Champion', description: '90-day streak', icon: 'fire', color: '#FFD93D', threshold: 90 },

  // Budget milestones
  { id: 'budget_1mo', title: 'Budget Keeper', description: 'Stay under budget for 1 month', icon: 'shield-check-outline', color: '#6BCB77', threshold: 1 },
  { id: 'budget_3mo', title: 'Budget Master', description: 'Stay under budget for 3 months', icon: 'shield-star-outline', color: '#4D96FF', threshold: 3 },
  { id: 'budget_6mo', title: 'Budget Legend', description: 'Stay under budget for 6 months', icon: 'shield-crown-outline', color: '#A855F7', threshold: 6 },

  // Category diversity
  { id: 'category_5', title: 'Diversified', description: 'Use 5+ categories in a month', icon: 'shape-outline', color: '#4D96FF', threshold: 5 },

  // Goals
  { id: 'first_goal_completed', title: 'Goal Crusher', description: 'Complete your first savings goal', icon: 'flag-checkered', color: '#FFD93D', threshold: 1 },
];

export function checkAchievements(
  totalExpenseCount: number,
  currentStreak: number,
  longestStreak: number,
  budgetMonthsUnder: number,
  categoriesUsedThisMonth: number,
  completedGoals: number,
  earned: Record<string, number>,
): AchievementId[] {
  const newlyEarned: AchievementId[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (earned[achievement.id]) continue;

    let qualifies = false;
    switch (achievement.id) {
      case 'expense_10':
      case 'expense_50':
      case 'expense_100':
      case 'expense_500':
        qualifies = totalExpenseCount >= achievement.threshold;
        break;
      case 'streak_7':
      case 'streak_14':
      case 'streak_30':
      case 'streak_60':
      case 'streak_90':
        qualifies = Math.max(currentStreak, longestStreak) >= achievement.threshold;
        break;
      case 'budget_1mo':
      case 'budget_3mo':
      case 'budget_6mo':
        qualifies = budgetMonthsUnder >= achievement.threshold;
        break;
      case 'category_5':
        qualifies = categoriesUsedThisMonth >= achievement.threshold;
        break;
      case 'first_goal_completed':
        qualifies = completedGoals >= achievement.threshold;
        break;
    }

    if (qualifies) {
      newlyEarned.push(achievement.id);
    }
  }

  return newlyEarned;
}
