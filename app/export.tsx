import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useDialog } from '@/contexts/DialogContext';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NeuCard, NeuButton, NeuIconButton } from '@/components/ui';
import { exportToCSV } from '@/services/export';
import { spacing } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const { expenses } = useExpenseStore();
  const { currencySymbol } = useSettingsStore();
  const { showDialog, showError } = useDialog();
  const [isExporting, setIsExporting] = useState(false);

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const handleExport = async () => {
    if (expenses.length === 0) {
      showDialog({
        title: 'No Data',
        message: 'There are no expenses to export.',
        icon: 'information-outline',
        iconColor: colors.blue,
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }
    setIsExporting(true);
    try {
      await exportToCSV(expenses, currencySymbol);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      showError('Error', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <NeuIconButton icon="close" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Export Data</Text>
        <View style={{ width: 44 }} />
      </View>

      <NeuCard color={colors.cardTintBlue} style={styles.infoCard}>
        <View style={styles.infoIconWrap}>
          <MaterialCommunityIcons name="export-variant" size={36} color={colors.blue} />
        </View>
        <Text style={styles.infoTitle}>Export to CSV</Text>
        <Text style={styles.infoDesc}>
          Export all your expense data as a CSV file that you can open in Excel, Google Sheets, or any spreadsheet application.
        </Text>
        <View style={styles.statsRow}>
          <NeuCard style={styles.statCard}>
            <Text style={styles.statValue}>{expenses.length}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </NeuCard>
        </View>
        <Text style={styles.fieldsTitle}>Exported fields:</Text>
        <Text style={styles.fieldsList}>
          Date, Category, Description, Amount, Payment Method, Notes
        </Text>
      </NeuCard>

      <NeuButton
        title={isExporting ? 'Exporting...' : 'Export CSV'}
        onPress={handleExport}
        variant="primary"
        size="lg"
        fullWidth
        loading={isExporting}
        disabled={isExporting || expenses.length === 0}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl, gap: spacing.md },
  headerTitle: { ...typography.h2, flex: 1, textAlign: 'center' },
  infoCard: { alignItems: 'center', marginBottom: spacing.xl },
  infoIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.blue + '15', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  infoTitle: { ...typography.h3, marginBottom: spacing.sm },
  infoDesc: { ...typography.bodySmall, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  statValue: { ...typography.h2, color: colors.blue },
  statLabel: { ...typography.caption },
  fieldsTitle: { ...typography.label, marginBottom: spacing.xs },
  fieldsList: { ...typography.bodySmall, textAlign: 'center' },
});
