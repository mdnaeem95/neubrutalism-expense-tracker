import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import type { GamificationData } from '@/types';
import { MILESTONE_THRESHOLDS } from '@/types';

const GAMIFICATION_KEY = 'gamification_data';

const DEFAULT_DATA: GamificationData = {
  streak: { currentStreak: 0, longestStreak: 0, lastLogDate: null },
  totalExpenseCount: 0,
  shownMilestones: [],
};

async function persistData(data: GamificationData) {
  await AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(data));
}

interface GamificationState extends GamificationData {
  isLoaded: boolean;
  pendingMilestone: number | null;
  loadGamification: () => Promise<void>;
  recordExpenseAdded: () => void;
  checkStreakOnAppOpen: () => void;
  dismissMilestone: () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  ...DEFAULT_DATA,
  isLoaded: false,
  pendingMilestone: null,

  loadGamification: async () => {
    try {
      const stored = await AsyncStorage.getItem(GAMIFICATION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<GamificationData>;
        set({ ...DEFAULT_DATA, ...parsed, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
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
      persistData({ streak: state.streak, totalExpenseCount: state.totalExpenseCount, shownMilestones: state.shownMilestones });
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

    const newCount = state.totalExpenseCount + 1;

    let pendingMilestone: number | null = null;
    if (
      (MILESTONE_THRESHOLDS as readonly number[]).includes(newCount) &&
      !state.shownMilestones.includes(newCount)
    ) {
      pendingMilestone = newCount;
    }

    const newStreak = { currentStreak, longestStreak, lastLogDate };
    const newShownMilestones = pendingMilestone
      ? [...state.shownMilestones, pendingMilestone]
      : state.shownMilestones;

    set({
      streak: newStreak,
      totalExpenseCount: newCount,
      pendingMilestone,
      shownMilestones: newShownMilestones,
    });

    persistData({ streak: newStreak, totalExpenseCount: newCount, shownMilestones: newShownMilestones });
  },

  dismissMilestone: () => {
    set({ pendingMilestone: null });
  },
}));
