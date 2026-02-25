import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import 'react-native-reanimated';
import { initializeDatabase } from '@/db';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { initializeAds, loadInterstitial } from '@/services/ads';
import { initializeSubscriptions } from '@/services/subscriptions';
import { refreshNotifications } from '@/services/notifications';
import { processRecurringExpenses } from '@/services/recurring';
import { setupQuickActions } from '@/services/quickActions';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useIncomeStore } from '@/stores/useIncomeStore';
import { useSavingsGoalStore } from '@/stores/useSavingsGoalStore';
import { useDebtStore } from '@/stores/useDebtStore';
import { useTagStore } from '@/stores/useTagStore';
import { useTemplateStore } from '@/stores/useTemplateStore';
import { addShortcutListener, getInitialShortcut, ADD_EXPENSE_ACTIVITY_TYPE } from '@/services/siriShortcuts';
import AnimatedSplash from '@/components/AnimatedSplash';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DialogProvider } from '@/contexts/DialogContext';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';

// Quick actions routing — may not be available in Expo Go
let useQuickActionRoutingHook: () => void = () => {};
try {
  const quickActionsRouter = require('expo-quick-actions/router');
  useQuickActionRoutingHook = quickActionsRouter.useQuickActionRouting;
} catch {
  // Native module not available
}

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { colors, isDark } = useTheme();
  useQuickActionRoutingHook();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="paywall"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="export"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="expense/[id]" />
        <Stack.Screen name="category/index" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="budget/index" />
        <Stack.Screen name="budget/[id]" />
        <Stack.Screen name="income/index" />
        <Stack.Screen name="goals/index" />
        <Stack.Screen name="subscriptions/index" />
        <Stack.Screen name="debts/index" />
        <Stack.Screen name="achievements/index" />
        <Stack.Screen
          name="backup/index"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="import/index"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="report/index"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);

  const [fontsLoaded] = useFonts({
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  // Hide native splash immediately so AnimatedSplash takes over
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        initializeDatabase();
        await useSettingsStore.getState().loadSettings();
        useCategoryStore.getState().loadCategories();
        useExpenseStore.getState().loadExpenses();
        // Generate any overdue recurring expenses, then reload
        const generated = processRecurringExpenses();
        if (generated > 0) useExpenseStore.getState().loadExpenses();
        useBudgetStore.getState().loadBudgets();
        useIncomeStore.getState().loadIncome();
        useSavingsGoalStore.getState().loadGoals();
        useDebtStore.getState().loadDebts();
        useTagStore.getState().loadTags();
        useTemplateStore.getState().loadTemplates();
        await useGamificationStore.getState().loadGamification();
        useGamificationStore.getState().checkStreakOnAppOpen();
        await useSubscriptionStore.getState().loadSubscriptionStatus();
        await initializeAds();
        loadInterstitial();
        await initializeSubscriptions();
        const settings = useSettingsStore.getState();
        if (settings.notificationsEnabled || settings.budgetAlerts || settings.dailyReminderEnabled || settings.dailySummaryEnabled) {
          const streak = useGamificationStore.getState().streak?.currentStreak ?? 0;
          await refreshNotifications(settings.notificationsEnabled, settings.budgetAlerts, settings.dailyReminderEnabled, streak, settings.dailySummaryEnabled, settings.currencySymbol);
        }
        setupQuickActions();
      } catch (error) {
        console.error('Bootstrap error:', error);
      } finally {
        setIsReady(true);
      }
    }

    bootstrap();
  }, []);

  // Handle Siri shortcut invocation (iOS only)
  useEffect(() => {
    if (!addShortcutListener || !isReady) return;

    const subscription = addShortcutListener(({ activityType }: any) => {
      if (activityType === ADD_EXPENSE_ACTIVITY_TYPE) {
        router.push('/(tabs)/add');
      }
    });

    if (getInitialShortcut) {
      getInitialShortcut().then((shortcut: any) => {
        if (shortcut?.activityType === ADD_EXPENSE_ACTIVITY_TYPE) {
          router.push('/(tabs)/add');
        }
      });
    }

    return () => { if (subscription?.remove) subscription.remove(); };
  }, [isReady]);

  // Show AnimatedSplash until both animation and bootstrap are done
  if (!animationDone || !isReady || !fontsLoaded) {
    return <AnimatedSplash onFinish={() => setAnimationDone(true)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <DialogProvider>
            <RootLayoutInner />
          </DialogProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
