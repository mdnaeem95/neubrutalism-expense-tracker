import { create } from 'zustand';
import { checkSubscriptionStatus } from '@/services/subscriptions';

const isDev = __DEV__;

interface SubscriptionState {
  isPremium: boolean;
  isLoading: boolean;
  loadSubscriptionStatus: () => Promise<void>;
  setPremium: (value: boolean) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isPremium: isDev,
  isLoading: !isDev,

  loadSubscriptionStatus: async () => {
    if (isDev) {
      set({ isPremium: true, isLoading: false });
      return;
    }
    try {
      const isPremium = await checkSubscriptionStatus();
      set({ isPremium, isLoading: false });
    } catch {
      set({ isPremium: false, isLoading: false });
    }
  },

  setPremium: (value) => {
    set({ isPremium: value });
  },
}));
