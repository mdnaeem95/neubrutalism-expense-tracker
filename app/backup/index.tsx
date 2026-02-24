import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { NeuCard, NeuButton, NeuIconButton } from '@/components/ui';
import { shareBackup, parseBackupFile, importBackup } from '@/services/backup';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { useIncomeStore } from '@/stores/useIncomeStore';
import { useSavingsGoalStore } from '@/stores/useSavingsGoalStore';
import { useDebtStore } from '@/stores/useDebtStore';
import { useTagStore } from '@/stores/useTagStore';
import { useTemplateStore } from '@/stores/useTemplateStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useTheme } from '@/lib/ThemeContext';
import { useDialog } from '@/contexts/DialogContext';
import { spacing } from '@/lib/theme';
import { format } from 'date-fns';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';

export default function BackupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const { showDialog, showError, showSuccess, showConfirm } = useDialog();

  const { lastBackupDate, updateSetting, loadSettings } = useSettingsStore();
  const { loadCategories } = useCategoryStore();
  const { loadExpenses } = useExpenseStore();
  const { loadBudgets } = useBudgetStore();
  const { loadIncome } = useIncomeStore();
  const { loadGoals } = useSavingsGoalStore();
  const { loadDebts } = useDebtStore();
  const { loadTags } = useTagStore();
  const { loadTemplates } = useTemplateStore();
  const { loadGamification } = useGamificationStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const lastBackupText = useMemo(() => {
    if (!lastBackupDate) return 'Never';
    return format(new Date(lastBackupDate), 'MMM d, yyyy h:mm a');
  }, [lastBackupDate]);

  function reloadAllStores() {
    loadCategories();
    loadExpenses();
    loadBudgets();
    loadIncome();
    loadGoals();
    loadDebts();
    loadTags();
    loadTemplates();
    loadGamification();
    loadSettings();
  }

  async function handleCreateBackup() {
    setIsExporting(true);
    try {
      await shareBackup();
      await updateSetting('lastBackupDate', Date.now());
      showSuccess('Backup Created', 'Your data has been exported and is ready to save.');
    } catch (err: any) {
      // User may have cancelled the share sheet — only show error for real failures
      if (!String(err?.message ?? '').toLowerCase().includes('cancel')) {
        showError('Backup Failed', 'Could not create the backup file. Please try again.');
      }
    } finally {
      setIsExporting(false);
    }
  }

  async function handleRestoreBackup() {
    let pickerResult;
    try {
      pickerResult = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
    } catch {
      showError('File Picker Error', 'Could not open the file picker. Please try again.');
      return;
    }

    if (pickerResult.canceled || !pickerResult.assets?.length) return;

    const uri = pickerResult.assets[0].uri;

    let backupData;
    try {
      backupData = await parseBackupFile(uri);
    } catch {
      showError('Invalid Backup', 'The selected file is not a valid Ledgr backup.');
      return;
    }

    showConfirm({
      title: 'Restore Backup',
      message:
        'This will replace ALL current data with the backup. This action cannot be undone. Are you sure?',
      confirmLabel: 'Restore',
      onConfirm: async () => {
        setIsRestoring(true);
        try {
          await importBackup(backupData);
          reloadAllStores();
          showSuccess(
            'Restore Complete',
            'Your data has been restored successfully.',
          );
        } catch {
          showError('Restore Failed', 'Could not restore the backup. The file may be corrupted.');
        } finally {
          setIsRestoring(false);
        }
      },
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <NeuIconButton icon="close" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Backup & Restore</Text>
        {/* Spacer to keep title centred */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350 }}
        >
          <NeuCard color={colors.cardTintBlue} style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.secondary + '25' }]}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={22}
                  color={colors.secondary}
                />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Local Storage</Text>
                <Text style={styles.infoDesc}>
                  Your data lives on this device. Create backups to keep it safe across reinstalls or
                  device changes.
                </Text>
              </View>
            </View>
          </NeuCard>
        </MotiView>

        {/* Last backup */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 60 }}
        >
          <NeuCard style={styles.lastBackupCard}>
            <View style={styles.lastBackupRow}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.lastBackupLabel}>Last backup</Text>
              <Text style={[styles.lastBackupDate, !lastBackupDate && { color: colors.textLight }]}>
                {lastBackupText}
              </Text>
            </View>
          </NeuCard>
        </MotiView>

        {/* Create Backup */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 120 }}
        >
          <Text style={styles.sectionTitle}>Create Backup</Text>
          <NeuCard style={styles.actionCard}>
            <View style={styles.actionRow}>
              <View style={[styles.actionIconWrap, { backgroundColor: colors.primary + '20' }]}>
                <MaterialCommunityIcons
                  name="database-export-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Export All Data</Text>
                <Text style={styles.actionDesc}>
                  Exports expenses, categories, budgets, goals, debts, tags and settings to a JSON
                  file.
                </Text>
              </View>
            </View>

            {isExporting ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.actionDesc, { marginLeft: spacing.sm }]}>
                  Creating backup…
                </Text>
              </View>
            ) : (
              <NeuButton
                title="Create Backup"
                onPress={handleCreateBackup}
                variant="primary"
                fullWidth
                style={{ marginTop: spacing.md }}
                icon={
                  <MaterialCommunityIcons
                    name="export-variant"
                    size={16}
                    color={colors.onPrimary}
                  />
                }
              />
            )}
          </NeuCard>
        </MotiView>

        {/* Restore */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 180 }}
        >
          <Text style={styles.sectionTitle}>Restore from Backup</Text>
          <NeuCard style={styles.actionCard}>
            <View style={styles.actionRow}>
              <View style={[styles.actionIconWrap, { backgroundColor: colors.accent + '25' }]}>
                <MaterialCommunityIcons
                  name="database-import-outline"
                  size={24}
                  color={colors.text}
                />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Import from File</Text>
                <Text style={styles.actionDesc}>
                  Select a previously exported Ledgr backup (.json) to restore your data.
                </Text>
              </View>
            </View>

            {isRestoring ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.accent} />
                <Text style={[styles.actionDesc, { marginLeft: spacing.sm }]}>
                  Restoring data…
                </Text>
              </View>
            ) : (
              <NeuButton
                title="Choose Backup File"
                onPress={handleRestoreBackup}
                variant="outline"
                fullWidth
                style={{ marginTop: spacing.md }}
                icon={
                  <MaterialCommunityIcons
                    name="folder-open-outline"
                    size={16}
                    color={colors.text}
                  />
                }
              />
            )}

            {/* Warning */}
            <View style={styles.warningRow}>
              <MaterialCommunityIcons
                name="alert-outline"
                size={14}
                color={colors.error}
              />
              <Text style={styles.warningText}>
                Restoring will replace all current data. This cannot be undone.
              </Text>
            </View>
          </NeuCard>
        </MotiView>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    headerTitle: {
      ...typography.h3,
    },
    headerSpacer: {
      width: 44, // matches NeuIconButton width to keep title centred
    },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
    },

    // Section label
    sectionTitle: {
      ...typography.label,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },

    // Info card
    infoCard: { marginBottom: spacing.md },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    infoIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoText: { flex: 1 },
    infoTitle: {
      ...typography.body,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    infoDesc: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      lineHeight: 18,
    },

    // Last backup
    lastBackupCard: { marginBottom: spacing.sm },
    lastBackupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    lastBackupLabel: {
      ...typography.body,
      flex: 1,
      color: colors.textSecondary,
    },
    lastBackupDate: {
      ...typography.body,
      fontWeight: '700',
      color: colors.text,
    },

    // Action cards
    actionCard: { marginBottom: spacing.sm },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    actionIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionInfo: { flex: 1 },
    actionTitle: {
      ...typography.body,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    actionDesc: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      lineHeight: 18,
    },

    // Loading row
    loadingWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
    },

    // Warning
    warningRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      marginTop: spacing.md,
      padding: spacing.sm,
      backgroundColor: colors.error + '12',
      borderRadius: 8,
    },
    warningText: {
      ...typography.caption,
      color: colors.error,
      flex: 1,
      lineHeight: 16,
    },
  });
