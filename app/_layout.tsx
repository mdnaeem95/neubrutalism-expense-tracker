import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
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
import AnimatedSplash from '@/components/AnimatedSplash';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DialogProvider } from '@/contexts/DialogContext';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { lightColors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { colors, isDark } = useTheme();

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
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

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
        await useSubscriptionStore.getState().loadSubscriptionStatus();
        await initializeAds();
        loadInterstitial();
        await initializeSubscriptions();
        const settings = useSettingsStore.getState();
        if (settings.notificationsEnabled || settings.budgetAlerts) {
          await refreshNotifications(settings.notificationsEnabled, settings.budgetAlerts);
        }
      } catch (error) {
        console.error('Bootstrap error:', error);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    bootstrap();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={lightColors.primary} />
      </View>
    );
  }

  if (showAnimatedSplash) {
    return <AnimatedSplash onFinish={() => setShowAnimatedSplash(false)} />;
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.background,
  },
});
