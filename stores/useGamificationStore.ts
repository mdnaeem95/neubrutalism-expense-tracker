import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import type { GamificationData, XPData } from '@/types';
import { calculateXPData, XP_REWARDS } from '@/types';

const GAMIFICATION_KEY = 'gamification_data';

const DEFAULT_DATA: GamificationData = {
  streak: { currentStreak: 0, longestStreak: 0, lastLogDate: null },
  totalExpenseCount: 0,
  totalXP: 0,
  currentLevel: 1,
  shownLevelUps: [],
};

async function persistData(data: GamificationData) {
  await AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(data));
}

interface GamificationState extends GamificationData {
  isLoaded: boolean;
  pendingLevelUp: number | null;
  lastXPGain: { amount: number; label: string } | null;
  xpData: XPData;
  loadGamification: () => Promise<void>;
  recordExpenseAdded: () => void;
  checkStreakOnAppOpen: () => void;
  dismissLevelUp: () => void;
  dismissXPGain: () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  ...DEFAULT_DATA,
  isLoaded: false,
  pendingLevelUp: null,
  lastXPGain: null,
  xpData: calculateXPData(0),

  loadGamification: async () => {
    try {
      const stored = await AsyncStorage.getItem(GAMIFICATION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<GamificationData> & { shownMilestones?: number[] };
        // Migration: old data had shownMilestones + no XP fields
        const totalXP = parsed.totalXP ?? (parsed.totalExpenseCount ?? 0) * XP_REWARDS.LOG_EXPENSE;
        const xpData = calculateXPData(totalXP);
        set({
          ...DEFAULT_DATA,
          ...parsed,
          totalXP,
          currentLevel: xpData.currentLevel,
          shownLevelUps: parsed.shownLevelUps ?? [],
          xpData,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true, xpData: calculateXPData(0) });
      }
    } catch {
      set({ isLoaded: true, xpData: calculateXPData(0) });
    }
  },

  checkStreakOnAppOpen: () => {
    const { streak } = get();
    if (!streak.lastLogDate) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const daysDiff = differenceInCalendarDays(parseISO(today), parseISO(streak.lastLogDate));

    if (daysDiff > 1) {
      const updated = { ...streak, currentStreak: 0 };
      set({ streak: updated });
      const state = get();
      persistData({
        streak: state.streak,
        totalExpenseCount: state.totalExpenseCount,
        totalXP: state.totalXP,
        currentLevel: state.currentLevel,
        shownLevelUps: state.shownLevelUps,
      });
    }
  },

  recordExpenseAdded: () => {
    const state = get();
    const today = format(new Date(), 'yyyy-MM-dd');
    let { currentStreak, longestStreak, lastLogDate } = state.streak;

    if (lastLogDate !== today) {
      if (lastLogDate) {
        const daysDiff = differenceInCalendarDays(parseISO(today), parseISO(lastLogDate));
        currentStreak = daysDiff === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      lastLogDate = today;
    }

    // XP calculation
    let xpGained = XP_REWARDS.LOG_EXPENSE;
    let xpLabel = `+${XP_REWARDS.LOG_EXPENSE} XP`;
    if (currentStreak > 1) {
      const streakBonus = XP_REWARDS.STREAK_BONUS_PER_DAY * currentStreak;
      xpGained += streakBonus;
      xpLabel = `+${XP_REWARDS.LOG_EXPENSE} XP  +${streakBonus} Streak`;
    }

    const newTotalXP = state.totalXP + xpGained;
    const oldXPData = calculateXPData(state.totalXP);
    const newXPData = calculateXPData(newTotalXP);
    const newCount = state.totalExpenseCount + 1;

    // Check for level up
    let pendingLevelUp: number | null = null;
    if (newXPData.currentLevel > oldXPData.currentLevel && !state.shownLevelUps.includes(newXPData.currentLevel)) {
      pendingLevelUp = newXPData.currentLevel;
    }

    const newStreak = { currentStreak, longestStreak, lastLogDate };
    const newShownLevelUps = pendingLevelUp
      ? [...state.shownLevelUps, pendingLevelUp]
      : state.shownLevelUps;

    set({
      streak: newStreak,
      totalExpenseCount: newCount,
      totalXP: newTotalXP,
      currentLevel: newXPData.currentLevel,
      xpData: newXPData,
      pendingLevelUp,
      lastXPGain: { amount: xpGained, label: xpLabel },
      shownLevelUps: newShownLevelUps,
    });

    persistData({
      streak: newStreak,
      totalExpenseCount: newCount,
      totalXP: newTotalXP,
      currentLevel: newXPData.currentLevel,
      shownLevelUps: newShownLevelUps,
    });
  },

  dismissLevelUp: () => {
    set({ pendingLevelUp: null });
  },

  dismissXPGain: () => {
    set({ lastXPGain: null });
  },
}));
