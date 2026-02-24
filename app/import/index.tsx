import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { NeuCard, NeuButton, NeuIconButton, NeuBadge } from '@/components/ui';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import {
  parseCSV,
  autoMapColumns,
  matchCategory,
  executeImport,
  parseDate,
  parseAmount,
} from '@/services/import';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Step = 1 | 2 | 3 | 4;

interface ColumnMapping {
  dateCol: number;
  amountCol: number;
  descCol: number;
  catCol: number;
}

interface MappedRow {
  date: Date;
  amount: number;
  description: string;
  categoryId: string;
  rawCategory: string;
  categoryMatched: boolean;
}

interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildMappedRows(
  parsed: ParsedCSV,
  mapping: ColumnMapping,
  categories: ReturnType<typeof useCategoryStore['getState']>['categories'],
  fallbackCategoryId: string
): { rows: MappedRow[]; warnings: string[] } {
  const { headers, rows } = parsed;
  const mappedRows: MappedRow[] = [];
  const warnings: string[] = [];

  rows.forEach((row, idx) => {
    const rawDate = mapping.dateCol >= 0 ? (row[mapping.dateCol] ?? '') : '';
    const rawAmount = mapping.amountCol >= 0 ? (row[mapping.amountCol] ?? '') : '';
    const rawDesc = mapping.descCol >= 0 ? (row[mapping.descCol] ?? '') : '';
    const rawCat = mapping.catCol >= 0 ? (row[mapping.catCol] ?? '') : '';

    const date = parseDate(rawDate);
    const amount = parseAmount(rawAmount);

    if (!date) {
      warnings.push(`Row ${idx + 1}: Could not parse date "${rawDate}" — skipped.`);
      return;
    }
    if (amount === null || isNaN(amount)) {
      warnings.push(`Row ${idx + 1}: Could not parse amount "${rawAmount}" — skipped.`);
      return;
    }

    const absAmount = Math.abs(amount);
    const catId = matchCategory(rawCat, categories) ?? fallbackCategoryId;
    const matched = !!matchCategory(rawCat, categories);

    mappedRows.push({
      date,
      amount: absAmount,
      description: rawDesc || 'Imported expense',
      categoryId: catId,
      rawCategory: rawCat,
      categoryMatched: matched,
    });
  });

  return { rows: mappedRows, warnings };
}

// ---------------------------------------------------------------------------
// ColumnPicker — simple pressable row to cycle through column options
// ---------------------------------------------------------------------------
interface ColumnPickerProps {
  label: string;
  colIndex: number;
  headers: string[];
  onChange: (newIndex: number) => void;
  colors: ThemeColors;
  typography: ThemeTypography;
}

function ColumnPicker({ label, colIndex, headers, onChange, colors, typography }: ColumnPickerProps) {
  const options = ['(none)', ...headers];
  const currentLabel = colIndex >= 0 ? headers[colIndex] : '(none)';

  const cycle = (dir: 1 | -1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // colIndex -1 means none; 0..n-1 maps to headers
    const current = colIndex + 1; // shift so -1 → 0, 0 → 1, etc.
    const next = (current + dir + options.length) % options.length;
    onChange(next - 1); // shift back
  };

  return (
    <View style={pickerStyles(colors).row}>
      <Text style={[typography.label, { fontSize: 11, flex: 1, color: colors.textSecondary }]}>
        {label}
      </Text>
      <Pressable
        onPress={() => cycle(-1)}
        hitSlop={8}
        style={pickerStyles(colors).arrowBtn}
      >
        <MaterialCommunityIcons name="chevron-left" size={18} color={colors.text} />
      </Pressable>
      <View style={pickerStyles(colors).valueBox}>
        <Text
          numberOfLines={1}
          style={[typography.bodySmall, { color: colIndex >= 0 ? colors.text : colors.textLight, fontWeight: '700' }]}
        >
          {currentLabel}
        </Text>
      </View>
      <Pressable
        onPress={() => cycle(1)}
        hitSlop={8}
        style={pickerStyles(colors).arrowBtn}
      >
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const pickerStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    arrowBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surface,
    },
    valueBox: {
      flex: 2,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.background,
      alignItems: 'center',
    },
  });

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function ImportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const { categories } = useCategoryStore();
  const { loadExpenses } = useExpenseStore();

  // Find the "other" / fallback category id
  const fallbackCategoryId = useMemo(() => {
    return (
      categories.find((c) => c.name.toLowerCase() === 'other')?.id ??
      categories[0]?.id ??
      ''
    );
  }, [categories]);

  // ---- State ----
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState<string>('');
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    dateCol: -1,
    amountCol: -1,
    descCol: -1,
    catCol: -1,
  });
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  // ---- Handlers ----
  const handlePickFile = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'public.comma-separated-values'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setFileName(asset.name ?? 'file.csv');

      // Read the file content
      const response = await fetch(asset.uri);
      const text = await response.text();

      if (!text.trim()) {
        setError('The selected file appears to be empty.');
        return;
      }

      const csvData = parseCSV(text);

      if (csvData.headers.length === 0) {
        setError('Could not parse any columns from the file. Make sure it is a valid CSV.');
        return;
      }

      if (csvData.rows.length === 0) {
        setError('The file has headers but no data rows.');
        return;
      }

      const autoMap = autoMapColumns(csvData.headers);
      setParsed(csvData);
      setMapping(autoMap);
      setStep(2);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to read file: ${msg}`);
    }
  };

  const handleConfirmMapping = () => {
    if (!parsed) return;
    setError(null);

    if (mapping.dateCol < 0) {
      setError('Please select a column for Date.');
      return;
    }
    if (mapping.amountCol < 0) {
      setError('Please select a column for Amount.');
      return;
    }

    const { rows: built, warnings: warns } = buildMappedRows(
      parsed,
      mapping,
      categories,
      fallbackCategoryId
    );

    if (built.length === 0) {
      setError('No valid rows found. Check your column mapping and date/amount formats.');
      return;
    }

    setMappedRows(built);
    setWarnings(warns);
    setStep(3);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleImport = () => {
    setError(null);
    setIsImporting(true);
    try {
      const count = executeImport(mappedRows);
      setImportedCount(count);
      loadExpenses();
      setStep(4);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Import failed: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFileName('');
    setParsed(null);
    setMapping({ dateCol: -1, amountCol: -1, descCol: -1, catCol: -1 });
    setMappedRows([]);
    setWarnings([]);
    setError(null);
    setImportedCount(null);
  };

  // ---- Step indicator ----
  const STEP_LABELS = ['Pick File', 'Map Columns', 'Preview', 'Done'];

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {STEP_LABELS.map((label, i) => {
        const stepNum = (i + 1) as Step;
        const active = stepNum === step;
        const done = stepNum < step;
        return (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                done && { backgroundColor: colors.green },
                active && { backgroundColor: colors.primary },
              ]}
            >
              {done ? (
                <MaterialCommunityIcons name="check" size={12} color="#fff" />
              ) : (
                <Text style={styles.stepDotText}>{stepNum}</Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                active && { color: colors.primary, fontWeight: '700' },
                done && { color: colors.green },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // ---- Step 1: Pick file ----
  const renderStep1 = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
    >
      <NeuCard color={colors.cardTintBlue} style={styles.stepCard}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="file-import-outline" size={48} color={colors.blue} />
        </View>
        <Text style={[typography.h3, styles.cardTitle]}>Import from CSV</Text>
        <Text style={[typography.bodySmall, styles.cardDesc]}>
          Select a CSV file exported from your bank, another expense app, or a spreadsheet.
          The file must contain at least a date column and an amount column.
        </Text>
        <NeuButton
          title="Choose CSV File"
          onPress={handlePickFile}
          variant="secondary"
          size="lg"
          fullWidth
          icon={<MaterialCommunityIcons name="folder-open-outline" size={18} color="#fff" />}
        />
      </NeuCard>

      <NeuCard style={styles.tipCard} color={colors.cardTintYellow}>
        <View style={styles.tipRow}>
          <MaterialCommunityIcons name="lightbulb-outline" size={20} color={colors.accent} />
          <Text style={[typography.bodySmall, styles.tipText]}>
            Supported formats: Bank exports, Ledgr CSV exports, Excel/Google Sheets saved as CSV.
          </Text>
        </View>
      </NeuCard>
    </MotiView>
  );

  // ---- Step 2: Map columns ----
  const renderStep2 = () => {
    if (!parsed) return null;
    const previewRows = parsed.rows.slice(0, 3);

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
      >
        {/* File info */}
        <NeuCard style={styles.fileNameCard} color={colors.cardTintGreen}>
          <View style={styles.fileNameRow}>
            <MaterialCommunityIcons name="file-check-outline" size={20} color={colors.green} />
            <Text style={[typography.bodySmall, { flex: 1, color: colors.green, fontWeight: '700' }]} numberOfLines={1}>
              {fileName}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {parsed.rows.length} rows
            </Text>
          </View>
        </NeuCard>

        {/* Column mapping */}
        <NeuCard style={styles.stepCard}>
          <Text style={[typography.h3, { marginBottom: spacing.md }]}>Map Columns</Text>
          <Text style={[typography.bodySmall, { marginBottom: spacing.lg, color: colors.textSecondary }]}>
            Match each field to the correct column in your CSV. Use the arrows to cycle through options.
          </Text>

          <ColumnPicker
            label="DATE *"
            colIndex={mapping.dateCol}
            headers={parsed.headers}
            onChange={(v) => setMapping((m) => ({ ...m, dateCol: v }))}
            colors={colors}
            typography={typography}
          />
          <View style={styles.divider} />
          <ColumnPicker
            label="AMOUNT *"
            colIndex={mapping.amountCol}
            headers={parsed.headers}
            onChange={(v) => setMapping((m) => ({ ...m, amountCol: v }))}
            colors={colors}
            typography={typography}
          />
          <View style={styles.divider} />
          <ColumnPicker
            label="DESCRIPTION"
            colIndex={mapping.descCol}
            headers={parsed.headers}
            onChange={(v) => setMapping((m) => ({ ...m, descCol: v }))}
            colors={colors}
            typography={typography}
          />
          <View style={styles.divider} />
          <ColumnPicker
            label="CATEGORY"
            colIndex={mapping.catCol}
            headers={parsed.headers}
            onChange={(v) => setMapping((m) => ({ ...m, catCol: v }))}
            colors={colors}
            typography={typography}
          />
        </NeuCard>

        {/* Raw preview */}
        <NeuCard style={styles.stepCard} color={colors.cardTintGray}>
          <Text style={[typography.label, { marginBottom: spacing.sm, fontSize: 11 }]}>
            Raw Preview (first 3 rows)
          </Text>
          {previewRows.map((row, ri) => (
            <View key={ri} style={styles.rawRow}>
              {parsed.headers.map((h, ci) => (
                <View key={ci} style={styles.rawCell}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                    {h}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.text }]} numberOfLines={1}>
                    {row[ci] ?? '—'}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </NeuCard>

        <NeuButton
          title="Continue to Preview"
          onPress={handleConfirmMapping}
          variant="primary"
          size="lg"
          fullWidth
        />
      </MotiView>
    );
  };

  // ---- Step 3: Preview mapped data ----
  const renderStep3 = () => {
    const previewRows = mappedRows.slice(0, 5);
    const unmatchedCount = mappedRows.filter((r) => !r.categoryMatched && r.rawCategory).length;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
      >
        {/* Summary card */}
        <NeuCard color={colors.cardTintBlue} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[typography.h2, { color: colors.blue }]}>{mappedRows.length}</Text>
              <Text style={typography.caption}>Expenses</Text>
            </View>
            {warnings.length > 0 && (
              <View style={styles.summaryItem}>
                <Text style={[typography.h2, { color: colors.warning }]}>{warnings.length}</Text>
                <Text style={typography.caption}>Skipped</Text>
              </View>
            )}
            {unmatchedCount > 0 && (
              <View style={styles.summaryItem}>
                <Text style={[typography.h2, { color: colors.orange }]}>{unmatchedCount}</Text>
                <Text style={typography.caption}>No Category</Text>
              </View>
            )}
          </View>
        </NeuCard>

        {/* Warnings */}
        {warnings.length > 0 && (
          <NeuCard color={colors.cardTintYellow} style={styles.stepCard}>
            <View style={styles.warnHeader}>
              <MaterialCommunityIcons name="alert-outline" size={18} color={colors.warning} />
              <Text style={[typography.label, { fontSize: 11, color: colors.warning, marginLeft: spacing.xs }]}>
                {warnings.length} row{warnings.length !== 1 ? 's' : ''} skipped
              </Text>
            </View>
            {warnings.slice(0, 3).map((w, i) => (
              <Text key={i} style={[typography.bodySmall, styles.warnText]}>{w}</Text>
            ))}
            {warnings.length > 3 && (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                +{warnings.length - 3} more
              </Text>
            )}
          </NeuCard>
        )}

        {/* Preview rows */}
        <Text style={[typography.label, { fontSize: 11, marginBottom: spacing.sm }]}>
          Preview (first 5)
        </Text>
        {previewRows.map((row, i) => {
          const cat = useCategoryStore.getState().categories.find((c) => c.id === row.categoryId);
          return (
            <MotiView
              key={i}
              from={{ opacity: 0, translateX: -10 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 250, delay: i * 50 }}
            >
              <NeuCard style={styles.previewRow}>
                <View style={styles.previewTop}>
                  <Text style={[typography.body, { flex: 1 }]} numberOfLines={1}>
                    {row.description}
                  </Text>
                  <Text style={[typography.body, { color: colors.secondary, fontWeight: '700' }]}>
                    {row.amount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.previewBottom}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {format(row.date, 'MMM d, yyyy')}
                  </Text>
                  {cat ? (
                    <NeuBadge
                      label={cat.name}
                      color={cat.color + '40'}
                      textColor={cat.color}
                      size="sm"
                    />
                  ) : (
                    <NeuBadge
                      label="Uncategorized"
                      color={colors.cardTintGray}
                      textColor={colors.textSecondary}
                      size="sm"
                    />
                  )}
                </View>
              </NeuCard>
            </MotiView>
          );
        })}

        {mappedRows.length > 5 && (
          <Text style={[typography.caption, styles.moreText]}>
            +{mappedRows.length - 5} more expenses will be imported
          </Text>
        )}

        <NeuButton
          title={`Import ${mappedRows.length} Expense${mappedRows.length !== 1 ? 's' : ''}`}
          onPress={handleImport}
          variant="primary"
          size="lg"
          fullWidth
          loading={isImporting}
          disabled={isImporting || mappedRows.length === 0}
          icon={<MaterialCommunityIcons name="database-import-outline" size={18} color={colors.text} />}
          style={{ marginTop: spacing.md }}
        />
        <NeuButton
          title="Back"
          onPress={() => setStep(2)}
          variant="outline"
          size="md"
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </MotiView>
    );
  };

  // ---- Step 4: Done ----
  const renderStep4 = () => (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <NeuCard color={colors.cardTintGreen} style={styles.doneCard}>
        <View style={styles.doneIconWrap}>
          <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.green} />
        </View>
        <Text style={[typography.h2, { marginBottom: spacing.sm, textAlign: 'center' }]}>
          Import Complete!
        </Text>
        <Text style={[typography.body, { textAlign: 'center', color: colors.textSecondary, marginBottom: spacing.lg }]}>
          Successfully imported{' '}
          <Text style={{ color: colors.green, fontWeight: '700' }}>
            {importedCount} expense{importedCount !== 1 ? 's' : ''}
          </Text>{' '}
          into Ledgr.
        </Text>

        <NeuButton
          title="Done"
          onPress={() => router.back()}
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginBottom: spacing.sm }}
        />
        <NeuButton
          title="Import Another File"
          onPress={handleReset}
          variant="outline"
          size="md"
          fullWidth
        />
      </NeuCard>
    </MotiView>
  );

  // ---- Render ----
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <NeuIconButton icon="close" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Import CSV</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Step indicator */}
      {renderStepIndicator()}

      {/* Error banner */}
      {error !== null && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const createStyles = (colors: ThemeColors, typography: ThemeTypography) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    headerTitle: {
      ...typography.h2,
      flex: 1,
      textAlign: 'center',
    },

    // Step indicator
    stepRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.lg,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    stepItem: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    stepDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.cardTintGray,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    stepDotText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      fontFamily: 'SpaceMono_700Bold',
    },
    stepLabel: {
      ...typography.caption,
      fontSize: 9,
      color: colors.textLight,
    },

    // Error
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      backgroundColor: colors.error + '18',
      borderWidth: 2,
      borderColor: colors.error,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    },
    errorText: {
      ...typography.bodySmall,
      color: colors.error,
      flex: 1,
      lineHeight: 18,
    },

    // Scroll
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 60,
    },

    // Cards
    stepCard: {
      marginBottom: spacing.md,
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: colors.blue + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      alignSelf: 'center',
    },
    cardTitle: {
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    cardDesc: {
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: spacing.lg,
      color: colors.textSecondary,
    },
    tipCard: {
      marginBottom: spacing.md,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    tipText: {
      flex: 1,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    fileNameCard: {
      marginBottom: spacing.md,
    },
    fileNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border + '30',
      marginVertical: spacing.xs,
    },

    // Raw preview
    rawRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '20',
    },
    rawCell: {
      minWidth: 60,
      flex: 1,
    },

    // Summary
    summaryCard: {
      marginBottom: spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    summaryItem: {
      alignItems: 'center',
      gap: spacing.xs,
    },

    // Warnings
    warnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    warnText: {
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      lineHeight: 18,
    },

    // Preview rows
    previewRow: {
      marginBottom: spacing.sm,
    },
    previewTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    previewBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    moreText: {
      textAlign: 'center',
      marginVertical: spacing.sm,
      color: colors.textSecondary,
    },

    // Done
    doneCard: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    doneIconWrap: {
      marginBottom: spacing.lg,
    },
  });
