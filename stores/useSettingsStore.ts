import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Settings, PaymentMethod, Theme } from '@/types';

const SETTINGS_KEY = 'app_settings';

const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  currencySymbol: '$',
  defaultPaymentMethod: 'cash',
  hasCompletedOnboarding: false,
  notificationsEnabled: false,
  budgetAlerts: true,
  dailyReminderEnabled: false,
  theme: 'system',
  gamificationEnabled: true,
};

interface SettingsState extends Settings {
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  formatAmount: (amount: number) => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings> & { mascotEnabled?: boolean };
        // Migrate old mascotEnabled -> gamificationEnabled
        if ('mascotEnabled' in parsed && !('gamificationEnabled' in parsed)) {
          (parsed as Partial<Settings>).gamificationEnabled = parsed.mascotEnabled;
        }
        delete (parsed as any).mascotEnabled;
        set({ ...DEFAULT_SETTINGS, ...parsed, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  updateSetting: async (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    const state = get();
    const settings: Settings = {
      currency: state.currency,
      currencySymbol: state.currencySymbol,
      defaultPaymentMethod: state.defaultPaymentMethod,
      hasCompletedOnboarding: state.hasCompletedOnboarding,
      notificationsEnabled: state.notificationsEnabled,
      budgetAlerts: state.budgetAlerts,
      dailyReminderEnabled: state.dailyReminderEnabled,
      theme: state.theme,
      gamificationEnabled: state.gamificationEnabled,
    };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  completeOnboarding: async () => {
    await get().updateSetting('hasCompletedOnboarding', true);
  },

  formatAmount: (amount: number) => {
    const { currencySymbol } = get();
    return `${currencySymbol}${amount.toFixed(2)}`;
  },
}));
