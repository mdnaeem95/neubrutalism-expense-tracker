import { NeuCard, NeuChip, NeuSwitch } from '@/components/ui';
import { useDialog } from '@/contexts/DialogContext';
import type { ThemeBorders, ThemeColors, ThemeTypography } from '@/lib/theme';
import { borderRadius, CURRENCIES, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { requestNotificationPermissions, scheduleBudgetAlerts, scheduleRecurringReminders, cancelAllNotifications, scheduleDailyReminder, cancelDailyReminder, scheduleDailySummary, cancelDailySummary } from '@/services/notifications';
import { useIncomeStore } from '@/stores/useIncomeStore';
import { useSavingsGoalStore } from '@/stores/useSavingsGoalStore';
import { useDebtStore } from '@/stores/useDebtStore';
import { useTagStore } from '@/stores/useTagStore';
import { useTemplateStore } from '@/stores/useTemplateStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { presentAddExpenseShortcut, nativeSiriAvailable } from '@/services/siriShortcuts';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SettingsRow({ icon, label, value, onPress, showArrow = true, color, colors, styles }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value?: string; onPress: () => void; showArrow?: boolean; color?: string; colors: ThemeColors; styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={styles.settingsRow}>
      <View style={[styles.settingsIcon, { backgroundColor: (color ?? colors.primary) + '20' }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color ?? colors.primary} />
      </View>
      <Text style={styles.settingsLabel}>{label}</Text>
      <View style={styles.settingsRight}>
        {value && <Text style={styles.settingsValue}>{value}</Text>}
        {showArrow && <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textLight} />}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, borders, shadows, typography } = useTheme();
  const {
    currency, currencySymbol, notificationsEnabled, budgetAlerts, dailyReminderEnabled, dailySummaryEnabled, theme, gamificationEnabled, updateSetting,
  } = useSettingsStore();
  const { isPremium } = useSubscriptionStore();
  const { expenses, clearAllExpenses } = useExpenseStore();
  const { resetCategories } = useCategoryStore();
  const { clearAllBudgets } = useBudgetStore();
  const { showConfirm, showSuccess } = useDialog();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);

  const handleClearData = () => {
    showConfirm({
      title: 'Clear All Data',
      message: 'This will permanently delete all your expenses, income, savings goals, categories, budgets, debts, tags, and templates. This action cannot be undone.',
      confirmLabel: 'Clear All',
      onConfirm: () => {
        clearAllExpenses();
        clearAllBudgets();
        resetCategories();
        useDebtStore.getState().clearAllDebts();
        useTagStore.getState().clearAllTags();
        useTemplateStore.getState().clearAllTemplates();
        useIncomeStore.getState().clearAllIncome();
        useSavingsGoalStore.getState().clearAllGoals();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showSuccess('Data Cleared', 'All data has been removed.');
      },
    });
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Settings</Text>

      {/* Premium Banner */}
      {!isPremium && (
        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 400 }}>
          <NeuCard color={colors.primary} style={styles.premiumBanner} onPress={() => router.push('/paywall')}>
            <View style={styles.premiumContent}>
              <View style={[styles.premiumIconWrap, { backgroundColor: colors.onPrimary + '15' }]}>
                <MaterialCommunityIcons name="star" size={24} color={colors.onPrimary} />
              </View>
              <View style={styles.premiumText}>
                <Text style={[styles.premiumTitle, { color: colors.onPrimary }]}>Upgrade to Pro</Text>
                <Text style={[styles.premiumDesc, { color: colors.onPrimary }]}>Unlock all features & remove ads</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onPrimary} />
            </View>
          </NeuCard>
        </MotiView>
      )}

      {/* Appearance Section */}
      <Text style={styles.sectionTitle}>Appearance</Text>
      <NeuCard>
        <Text style={styles.settingLabel}>Theme</Text>
        <View style={styles.chipRow}>
          {(['light', 'dark', 'system'] as const).map((t) => (
            <NeuChip
              key={t}
              label={t.charAt(0).toUpperCase() + t.slice(1)}
              selected={theme === t}
              onPress={() => updateSetting('theme', t)}
              color={colors.primary}
            />
          ))}
        </View>
        <View style={[styles.divider, { marginVertical: spacing.md }]} />
        <NeuSwitch
          label="Player XP"
          description="Track your progress with XP and levels"
          value={gamificationEnabled}
          onValueChange={(v) => updateSetting('gamificationEnabled', v)}
        />
      </NeuCard>

      {/* General */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 100 }}>
        <Text style={styles.sectionTitle}>General</Text>
        <NeuCard padded={false}>
          <SettingsRow
            icon="cash"
            label="Currency"
            value={`${currencySymbol} ${currency}`}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            colors={colors}
            styles={styles}
          />
          {showCurrencyPicker && (
            <View style={styles.currencyPicker}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateSetting('currency', c.code);
                    updateSetting('currencySymbol', c.symbol);
                    setShowCurrencyPicker(false);
                  }}
                  style={[styles.currencyItem, currency === c.code && styles.currencyItemSelected]}
                >
                  <Text style={styles.currencySymbol}>{c.symbol}</Text>
                  <Text style={styles.currencyCode}>{c.code}</Text>
                  <Text style={styles.currencyName}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.divider} />
          <SettingsRow icon="folder-outline" label="Categories" onPress={() => router.push('/category')} color={colors.purple} colors={colors} styles={styles} />
          <View style={styles.divider} />
          <SettingsRow icon="flag-outline" label="Budgets" onPress={() => {
            if (!isPremium) { router.push('/paywall'); return; }
            router.push('/budget');
          }} color={colors.green} colors={colors} styles={styles} />
          <View style={styles.divider} />
          <SettingsRow icon="repeat" label="Subscriptions" onPress={() => {
            if (!isPremium) { router.push('/paywall'); return; }
            router.push('/subscriptions');
          }} color={colors.blue} colors={colors} styles={styles} />
          <View style={styles.divider} />
          <SettingsRow icon="credit-card-outline" label="Debts & Loans" onPress={() => {
            if (!isPremium) { router.push('/paywall'); return; }
            router.push('/debts');
          }} color={colors.secondary} colors={colors} styles={styles} />
          <View style={styles.divider} />
          <SettingsRow icon="trophy-outline" label="Achievements" onPress={() => {
            router.push('/achievements');
          }} color={colors.accent} colors={colors} styles={styles} />
        </NeuCard>
      </MotiView>

      {/* Notifications */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 200 }}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <NeuCard>
          <NeuSwitch
            label="Push Notifications"
            description="Reminders for recurring expenses"
            value={notificationsEnabled}
            onValueChange={async (v) => {
              if (v) {
                const granted = await requestNotificationPermissions();
                if (!granted) return;
                await scheduleRecurringReminders();
              } else {
                // Cancel recurring reminders but keep budget alerts if enabled
                if (!budgetAlerts) await cancelAllNotifications();
              }
              updateSetting('notificationsEnabled', v);
            }}
          />
          <NeuSwitch
            label="Budget Alerts"
            description="Notify when spending exceeds budget"
            value={budgetAlerts}
            onValueChange={async (v) => {
              if (v) {
                const granted = await requestNotificationPermissions();
                if (!granted) return;
                await scheduleBudgetAlerts();
              } else {
                if (!notificationsEnabled) await cancelAllNotifications();
              }
              updateSetting('budgetAlerts', v);
            }}
          />
          <NeuSwitch
            label="Daily Reminder"
            description="Remind you to log expenses at 8pm"
            value={dailyReminderEnabled}
            onValueChange={async (v) => {
              if (v) {
                const granted = await requestNotificationPermissions();
                if (!granted) return;
                const streak = useGamificationStore.getState().streak?.currentStreak ?? 0;
                await scheduleDailyReminder(streak);
              } else {
                await cancelDailyReminder();
              }
              updateSetting('dailyReminderEnabled', v);
            }}
          />
          <NeuSwitch
            label="Daily Summary"
            description="Get a spending summary at 9pm"
            value={dailySummaryEnabled}
            onValueChange={async (v) => {
              if (v) {
                const granted = await requestNotificationPermissions();
                if (!granted) return;
                await scheduleDailySummary();
              } else {
                await cancelDailySummary();
              }
              updateSetting('dailySummaryEnabled', v);
            }}
          />
        </NeuCard>
      </MotiView>

      {/* Siri & Shortcuts — iOS only */}
      {Platform.OS === 'ios' && nativeSiriAvailable && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 250 }}>
          <Text style={styles.sectionTitle}>Siri & Shortcuts</Text>
          <NeuCard>
            <View style={styles.siriSection}>
              <View style={styles.siriInfo}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.purple + '20' }]}>
                  <MaterialCommunityIcons name="microphone" size={18} color={colors.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { marginBottom: 0 }]}>Add Expense</Text>
                  <Text style={styles.siriDescription}>Use Siri or Back Tap to quickly add expenses</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  presentAddExpenseShortcut(({ status }) => {
                    if (status === 'added' || status === 'updated') {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      showSuccess('Siri Shortcut Added', 'Say "New expense" to Siri or assign to Back Tap.');
                    }
                  });
                }}
                style={[styles.siriButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <MaterialCommunityIcons name="microphone" size={16} color={colors.text} />
                <Text style={[styles.settingLabel, { marginBottom: 0 }]}>Add to Siri</Text>
              </Pressable>
            </View>
          </NeuCard>
        </MotiView>
      )}

      {/* Data */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 350 }}>
        <Text style={styles.sectionTitle}>Data</Text>
        <NeuCard padded={false}>
          <SettingsRow
            icon="export-variant"
            label="Export Data"
            value={`${expenses.length} expenses`}
            onPress={() => {
              if (!isPremium) { router.push('/paywall'); return; }
              router.push('/export');
            }}
            color={colors.blue}
            colors={colors}
            styles={styles}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="file-import-outline"
            label="Import CSV"
            onPress={() => {
              if (!isPremium) { router.push('/paywall'); return; }
              router.push('/import');
            }}
            color={colors.green}
            colors={colors}
            styles={styles}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="cloud-upload-outline"
            label="Backup & Restore"
            onPress={() => {
              if (!isPremium) { router.push('/paywall'); return; }
              router.push('/backup');
            }}
            color={colors.purple}
            colors={colors}
            styles={styles}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="delete-outline"
            label="Clear All Data"
            onPress={handleClearData}
            showArrow={false}
            color={colors.secondary}
            colors={colors}
            styles={styles}
          />
        </NeuCard>
      </MotiView>

      {/* About */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 450 }}>
        <Text style={styles.sectionTitle}>About</Text>
        <NeuCard padded={false}>
          <SettingsRow icon="information-outline" label="Version" value={require('expo-constants').default.expoConfig?.version ?? '—'} onPress={() => {}} showArrow={false} colors={colors} styles={styles} />
          <View style={styles.divider} />
          <SettingsRow icon="file-document-outline" label="Privacy Policy" onPress={() => {
            WebBrowser.openBrowserAsync('https://neubrut-website.vercel.app/legal/privacy-ledgr');
          }} color={colors.accent} colors={colors} styles={styles} />
          <View style={styles.divider} />
          <SettingsRow icon="clipboard-text-outline" label="Terms of Service" onPress={() => {
            WebBrowser.openBrowserAsync('https://neubrut-website.vercel.app/legal/terms-ledgr');
          }} color={colors.accent} colors={colors} styles={styles} />
        </NeuCard>
      </MotiView>

      {isPremium && (
        <View style={styles.premiumStatus}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MaterialCommunityIcons name="star" size={18} color={colors.primary} />
            <Text style={styles.premiumStatusText}>Premium Active</Text>
          </View>
        </View>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  screenTitle: { ...typography.h1, marginTop: spacing.md, marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  settingLabel: { ...typography.body, fontWeight: '600', marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  premiumBanner: { marginBottom: spacing.sm },
  premiumContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  premiumIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.text + '15', alignItems: 'center', justifyContent: 'center' },
  premiumText: { flex: 1 },
  premiumTitle: { ...typography.body, fontWeight: '800' },
  premiumDesc: { ...typography.caption },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  settingsIcon: { width: 36, height: 36, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { ...typography.body, fontWeight: '600', flex: 1 },
  settingsRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  settingsValue: { ...typography.bodySmall, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border + '15', marginHorizontal: spacing.lg },
  currencyPicker: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  currencyItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    gap: spacing.sm, borderRadius: borderRadius.sm, marginBottom: 4,
  },
  currencyItemSelected: { backgroundColor: colors.primary + '20' },
  currencySymbol: { fontSize: 18, fontWeight: '700', fontFamily: 'SpaceMono_700Bold', minWidth: 28, textAlign: 'center', color: colors.text },
  currencyCode: { fontSize: 14, fontWeight: '700', fontFamily: 'SpaceMono_700Bold', width: 36, color: colors.text },
  currencyName: { ...typography.bodySmall, flex: 1 },
  siriSection: { gap: spacing.sm },
  siriInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  siriDescription: { ...typography.caption, marginTop: 2 },
  siriButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, alignSelf: 'center', marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: borderRadius.sm, borderWidth: 2 },
  premiumStatus: { alignItems: 'center', marginTop: spacing.xl },
  premiumStatusText: { ...typography.body, fontWeight: '700', color: colors.primary },
});
