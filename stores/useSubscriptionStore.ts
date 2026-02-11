import { create } from 'zustand';
import { checkSubscriptionStatus } from '@/services/subscriptions';

interface SubscriptionState {
  isPremium: boolean;
  isLoading: boolean;
  loadSubscriptionStatus: () => Promise<void>;
  setPremium: (value: boolean) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isPremium: false,
  isLoading: true,

  loadSubscriptionStatus: async () => {
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
