import { NeuButton, NeuCard, NeuIconButton, NeuInput } from '@/components/ui';
import XPGainAnimation from '@/components/XPGainAnimation';
import { useDialog } from '@/contexts/DialogContext';
import { useTheme } from '@/lib/ThemeContext';
import { borderRadius, INCOME_SOURCES, PAYMENT_METHODS, spacing } from '@/lib/theme';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import { showInterstitial } from '@/services/ads';
import { donateAddExpenseShortcut } from '@/services/siriShortcuts';
import { saveReceipt } from '@/lib/receipt';
import { isOCRAvailable, extractReceiptData } from '@/services/ocr';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useIncomeStore } from '@/stores/useIncomeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useTemplateStore } from '@/stores/useTemplateStore';
import { useTagStore } from '@/stores/useTagStore';
import type { IncomeSource, PaymentMethod, RecurringFrequency } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const expenseSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine((v) => parseFloat(v) > 0, 'Must be greater than 0'),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof expenseSchema>;
type AddMode = 'expense' | 'income';

export default function AddExpenseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addExpense, incrementAddCount } = useExpenseStore();
  const { addIncome, canAddIncome, getMonthlyCount } = useIncomeStore();
  const { categories } = useCategoryStore();
  const { currencySymbol, defaultPaymentMethod, gamificationEnabled } = useSettingsStore();
  const { lastXPGain } = useGamificationStore();
  const { isPremium } = useSubscriptionStore();
  const { templates: savedTemplates } = useTemplateStore();
  const { tags: allTags } = useTagStore();
  const { colors, typography } = useTheme();

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [mode, setMode] = useState<AddMode>('expense');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
  const [selectedSource, setSelectedSource] = useState<IncomeSource>('salary');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<RecurringFrequency>('monthly');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const { showDialog } = useDialog();
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomeSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (incomeSuccessTimerRef.current) clearTimeout(incomeSuccessTimerRef.current);
    };
  }, []);

  const monthlyIncomeCount = getMonthlyCount();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { amount: '', description: '', notes: '' },
  });

  const imagePickerOptions: ImagePicker.ImagePickerOptions = {
    quality: 0.7,
    allowsEditing: true,
    aspect: [4, 3] as [number, number],
  };

  const handlePickReceipt = useCallback(() => {
    showDialog({
      title: 'Add Receipt',
      message: 'Choose how to add your receipt photo.',
      icon: 'camera-outline',
      iconColor: colors.accent,
      buttons: [
        {
          text: 'Take Photo',
          style: 'default',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync(imagePickerOptions);
            if (!result.canceled && result.assets[0]) {
              const persistedUri = await saveReceipt(result.assets[0].uri);
              setReceiptUri(persistedUri);
            }
          },
        },
        {
          text: 'Choose from Library',
          style: 'default',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
            if (!result.canceled && result.assets[0]) {
              const persistedUri = await saveReceipt(result.assets[0].uri);
              setReceiptUri(persistedUri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  }, [showDialog, colors]);

  const handleScanReceipt = useCallback(async () => {
    if (!receiptUri || !isOCRAvailable()) return;
    setIsScanning(true);
    try {
      const data = await extractReceiptData(receiptUri);
      if (data.amount) {
        reset({ amount: data.amount.toString(), description: data.merchant || '', notes: '' });
      } else if (data.merchant) {
        reset({ amount: '', description: data.merchant, notes: '' });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // OCR failed silently
    } finally {
      setIsScanning(false);
    }
  }, [receiptUri, reset]);

  const onSubmit = useCallback(async (data: FormData) => {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) return;

    const newExpense = addExpense({
      amount,
      categoryId: selectedCategory,
      description: data.description || '',
      date: selectedDate,
      paymentMethod,
      isRecurring: isRecurring && isPremium,
      recurringFrequency: isRecurring && isPremium ? recurringFreq : undefined,
      notes: data.notes || undefined,
      receiptUri: receiptUri || undefined,
    });

    // Save tags for this expense
    if (selectedTags.length > 0 && newExpense) {
      useTagStore.getState().setExpenseTags(newExpense.id, selectedTags);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    donateAddExpenseShortcut();
    useGamificationStore.getState().recordExpenseAdded();
    setShowSuccess(true);

    // Check if should show interstitial
    if (!isPremium) {
      const shouldShow = incrementAddCount();
      if (shouldShow) {
        await showInterstitial();
      }
    }

    successTimerRef.current = setTimeout(() => {
      setShowSuccess(false);
      useGamificationStore.getState().dismissXPGain();
      reset();
      setSelectedCategory(categories[0]?.id || '');
      setPaymentMethod(defaultPaymentMethod);
      setSelectedDate(new Date());
      setIsRecurring(false);
      setReceiptUri(null);
      setSelectedTags([]);
    }, 1500);
  }, [selectedCategory, selectedDate, paymentMethod, isRecurring, recurringFreq, isPremium, categories, defaultPaymentMethod, addExpense, incrementAddCount, reset, receiptUri, selectedTags]);

  const onSubmitIncome = useCallback(async (data: FormData) => {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) return;

    if (!canAddIncome(isPremium)) {
      showDialog({
        title: 'Monthly Limit Reached',
        message: `Free accounts can log 5 income entries per month. Upgrade to Pro for unlimited income tracking.`,
        icon: 'lock-outline',
        iconColor: colors.accent,
        buttons: [
          { text: 'Upgrade to Pro', style: 'default', onPress: () => router.push('/paywall') },
          { text: 'Cancel', style: 'cancel' },
        ],
      });
      return;
    }

    addIncome({
      amount,
      source: selectedSource,
      description: data.description || '',
      date: selectedDate,
      notes: data.notes || undefined,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSuccess(true);

    incomeSuccessTimerRef.current = setTimeout(() => {
      setShowSuccess(false);
      reset();
      setSelectedSource('salary');
      setSelectedDate(new Date());
    }, 1500);
  }, [selectedSource, selectedDate, isPremium, addIncome, canAddIncome, reset, showDialog, colors, router]);

  if (showSuccess) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top }]}>
        <MotiView
          from={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        >
          <NeuCard color={mode === 'income' ? colors.cardTintGreen : colors.green} style={styles.successCard}>
            <MaterialCommunityIcons name="check-circle" size={48} color={colors.green} />
            <Text style={styles.successTitle}>{mode === 'income' ? 'Income Added!' : 'Expense Added!'}</Text>
            <Text style={styles.successText}>Successfully recorded</Text>
          </NeuCard>
        </MotiView>
        {gamificationEnabled && lastXPGain && mode === 'expense' && (
          <XPGainAnimation label={lastXPGain.label} />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>{mode === 'income' ? 'Add Income' : 'Add Expense'}</Text>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => { setMode('expense'); reset(); }}
            style={[styles.modeBtn, mode === 'expense' && styles.modeBtnExpenseActive]}
          >
            <MaterialCommunityIcons name="minus-circle-outline" size={16} color={mode === 'expense' ? colors.text : colors.textSecondary} />
            <Text style={[styles.modeBtnText, mode === 'expense' && styles.modeBtnTextActive]}>EXPENSE</Text>
          </Pressable>
          <Pressable
            onPress={() => { setMode('income'); reset(); }}
            style={[styles.modeBtn, mode === 'income' && styles.modeBtnIncomeActive]}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={16} color={mode === 'income' ? colors.text : colors.textSecondary} />
            <Text style={[styles.modeBtnText, mode === 'income' && styles.modeBtnTextActive]}>INCOME</Text>
          </Pressable>
        </View>

        {/* Quick Templates */}
        {mode === 'expense' && savedTemplates.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md, marginHorizontal: -spacing.xl }} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
            {savedTemplates.map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId);
              return (
                <Pressable
                  key={t.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    reset({ amount: t.amount.toString(), description: t.description, notes: t.notes || '' });
                    setSelectedCategory(t.categoryId);
                    setPaymentMethod(t.paymentMethod);
                  }}
                  style={[styles.templateChip, { borderColor: cat?.color || colors.border }]}
                >
                  <MaterialCommunityIcons name={(cat?.icon || 'cube-outline') as any} size={14} color={cat?.color || colors.textSecondary} />
                  <Text style={styles.templateChipText} numberOfLines={1}>{t.name}</Text>
                  <Text style={styles.templateChipAmount}>{currencySymbol}{t.amount.toFixed(0)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Amount Input */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
          <NeuCard color={mode === 'income' ? colors.cardTintGreen : colors.cardTintPink} style={styles.amountCard}>
            <Text style={styles.amountLabel}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>{currencySymbol}</Text>
              <Controller
                control={control}
                name="amount"
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.amountInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                )}
              />
            </View>
            {errors.amount && <Text style={styles.errorText}>{errors.amount.message}</Text>}
          </NeuCard>
        </MotiView>

        {/* Category / Source Picker */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 100 }}>
          {mode === 'expense' ? (
            <>
              <Text style={styles.sectionLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(cat.id);
                    }}
                    style={[
                      styles.categoryItem,
                      selectedCategory === cat.id && { backgroundColor: cat.color + '30', borderColor: cat.color },
                    ]}
                  >
                    <MaterialCommunityIcons name={cat.icon as any} size={22} color={selectedCategory === cat.id ? cat.color : colors.textSecondary} />
                    <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Income Source</Text>
              <View style={styles.categoryGrid}>
                {INCOME_SOURCES.map((src) => (
                  <Pressable
                    key={src.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedSource(src.id as IncomeSource);
                    }}
                    style={[
                      styles.categoryItem,
                      selectedSource === src.id && { backgroundColor: src.color + '30', borderColor: src.color },
                    ]}
                  >
                    <MaterialCommunityIcons name={src.icon as any} size={22} color={selectedSource === src.id ? src.color : colors.textSecondary} />
                    <Text style={styles.categoryName} numberOfLines={1}>{src.label}</Text>
                  </Pressable>
                ))}
              </View>
              {!isPremium && (
                <View style={styles.freeHint}>
                  <MaterialCommunityIcons name="information-outline" size={14} color={colors.textLight} />
                  <Text style={styles.freeHintText}>{Math.max(0, 5 - monthlyIncomeCount)} of 5 free entries remaining this month</Text>
                </View>
              )}
            </>
          )}
        </MotiView>

        {/* Tags */}
        {mode === 'expense' && allTags.length > 0 && (
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 150 }}>
            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.categoryGrid}>
              {allTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedTags((prev) =>
                        isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                      );
                    }}
                    style={[
                      styles.paymentItem,
                      { flex: 0, paddingHorizontal: spacing.md },
                      isSelected && { backgroundColor: tag.color + '30', borderColor: tag.color },
                    ]}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tag.color }} />
                    <Text style={[styles.paymentLabel, isSelected && styles.paymentLabelSelected]}>{tag.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </MotiView>
        )}

        {/* Description */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 200 }}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <NeuInput
                label="Description"
                placeholder="What was this for?"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </MotiView>

        {/* Date */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 250 }}>
          <Text style={styles.sectionLabel}>Date</Text>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDatePicker(true); }}>
            <NeuCard style={styles.dateCard}>
              <MaterialCommunityIcons name="calendar" size={20} color={colors.text} />
              <Text style={styles.dateText}>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textLight} />
            </NeuCard>
          </Pressable>
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setSelectedDate(date);
              }}
            />
          )}
          {showDatePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="slide">
              <View style={styles.datePickerOverlay}>
                <View style={[styles.datePickerSheet, { backgroundColor: colors.surface }]}>
                  <View style={styles.datePickerHeader}>
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.datePickerDone, { color: colors.blue }]}>Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(_, date) => { if (date) setSelectedDate(date); }}
                  />
                </View>
              </View>
            </Modal>
          )}
        </MotiView>

        {/* Payment Method — expense only */}
        {mode === 'expense' && <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 300 }}>
          <Text style={styles.sectionLabel}>Payment Method</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_METHODS.map((pm) => (
              <Pressable
                key={pm.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPaymentMethod(pm.id as PaymentMethod);
                }}
                style={[
                  styles.paymentItem,
                  paymentMethod === pm.id && styles.paymentItemSelected,
                ]}
              >
                <MaterialCommunityIcons
                  name={pm.icon as any}
                  size={18}
                  color={paymentMethod === pm.id ? colors.text : colors.textSecondary}
                />
                <Text style={[styles.paymentLabel, paymentMethod === pm.id && styles.paymentLabelSelected]}>
                  {pm.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </MotiView>}

        {/* Recurring Toggle — expense only */}
        {mode === 'expense' && <>
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 350 }}>
          <Pressable
            onPress={() => {
              if (!isPremium) {
                router.push('/paywall');
                return;
              }
              setIsRecurring(!isRecurring);
            }}
            style={styles.recurringRow}
          >
            <View style={styles.recurringInfo}>
              <MaterialCommunityIcons name="repeat" size={20} color={colors.text} />
              <Text style={styles.recurringLabel}>Recurring Expense</Text>
              {!isPremium && <Text style={styles.proBadge}>PRO</Text>}
            </View>
            <View style={[styles.toggle, isRecurring && isPremium && styles.toggleActive]}>
              <View style={[styles.toggleThumb, isRecurring && isPremium && styles.toggleThumbActive]} />
            </View>
          </Pressable>

          {isRecurring && isPremium && (
            <View style={styles.frequencyRow}>
              {(['daily', 'weekly', 'monthly', 'yearly'] as RecurringFrequency[]).map((freq) => (
                <Pressable
                  key={freq}
                  onPress={() => setRecurringFreq(freq)}
                  style={[styles.freqChip, recurringFreq === freq && styles.freqChipSelected]}
                >
                  <Text style={[styles.freqText, recurringFreq === freq && styles.freqTextSelected]}>
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </MotiView></>}

        {/* Notes */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 400 }}>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <NeuInput
                label="Notes (optional)"
                placeholder="Add a note..."
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                containerStyle={{ marginBottom: spacing['2xl'] }}
              />
            )}
          />
        </MotiView>

        {/* Receipt Photo — expense only */}
        {mode === 'expense' && <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 450 }}>
          <Text style={styles.sectionLabel}>Receipt (optional)</Text>
          {receiptUri ? (
            <View style={styles.receiptPreview}>
              <NeuCard style={styles.receiptCard} padded={false}>
                <Image source={{ uri: receiptUri }} style={styles.receiptImage} />
              </NeuCard>
              <NeuIconButton
                icon="close-circle"
                onPress={() => setReceiptUri(null)}
                size={18}
                bgColor={colors.cardTintRed}
                color={colors.secondary}
                style={styles.receiptRemoveBtn}
              />
              {isPremium && isOCRAvailable() && (
                <NeuButton
                  title={isScanning ? 'Scanning...' : 'Scan Receipt'}
                  onPress={handleScanReceipt}
                  variant="outline"
                  size="sm"
                  loading={isScanning}
                  disabled={isScanning}
                  icon={<MaterialCommunityIcons name="text-recognition" size={16} color={colors.text} />}
                  style={{ marginTop: spacing.sm }}
                />
              )}
            </View>
          ) : (
            <Pressable onPress={handlePickReceipt} style={styles.receiptPlaceholder}>
              <MaterialCommunityIcons name="camera-outline" size={28} color={colors.textLight} />
              <Text style={styles.receiptPlaceholderText}>Add Receipt Photo</Text>
            </Pressable>
          )}
        </MotiView>}

        {/* Save Button */}
        <NeuButton
          title={mode === 'income' ? 'Save Income' : 'Save Expense'}
          onPress={mode === 'income' ? handleSubmit(onSubmitIncome) : handleSubmit(onSubmit)}
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginTop: spacing.md }}
        />

        <View style={{ height: 120 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  screenTitle: { ...typography.h1, marginTop: spacing.md, marginBottom: spacing.xl },
  amountCard: { marginBottom: spacing.xl, alignItems: 'center' },
  amountLabel: { ...typography.caption, marginBottom: spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 32, fontWeight: '800', color: colors.text, marginRight: spacing.xs, fontFamily: 'SpaceMono_700Bold' },
  amountInput: { fontSize: 48, fontWeight: '800', color: colors.text, minWidth: 120, textAlign: 'center', fontFamily: 'SpaceMono_700Bold' },
  errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
  sectionLabel: { ...typography.label, marginBottom: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  categoryItem: {
    width: '22%', alignItems: 'center', paddingVertical: spacing.md, borderWidth: 2.5,
    borderColor: colors.border + '30', borderRadius: borderRadius.md, backgroundColor: colors.surface,
  },
  categoryName: { fontSize: 10, fontWeight: '600', color: colors.text, textAlign: 'center', fontFamily: 'SpaceMono_400Regular' },
  dateCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  dateText: { ...typography.body, fontWeight: '600', flex: 1, fontFamily: 'SpaceMono_400Regular' },
  datePickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  datePickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.lg },
  datePickerDone: { fontSize: 16, fontWeight: '700', fontFamily: 'SpaceMono_700Bold' },
  paymentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  paymentItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: spacing.sm, borderWidth: 2.5, borderColor: colors.border + '30',
    borderRadius: borderRadius.md, backgroundColor: colors.surface,
  },
  paymentItemSelected: { borderColor: colors.border, backgroundColor: colors.primary + '30' },
  paymentLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: 'SpaceMono_400Regular' },
  paymentLabelSelected: { color: colors.text, fontWeight: '700', fontFamily: 'SpaceMono_700Bold' },
  recurringRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, marginBottom: spacing.md,
  },
  recurringInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recurringLabel: { ...typography.body, fontWeight: '600', fontFamily: 'SpaceMono_400Regular' },
  proBadge: {
    fontSize: 10, fontWeight: '800', color: colors.text, backgroundColor: colors.primary,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', fontFamily: 'SpaceMono_700Bold',
  },
  toggle: {
    width: 48, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: colors.border,
    backgroundColor: colors.background, padding: 2, justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 2.5, borderColor: colors.border },
  toggleThumbActive: { alignSelf: 'flex-end' },
  frequencyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  freqChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderWidth: 2.5,
    borderColor: colors.border + '30', borderRadius: borderRadius.md, backgroundColor: colors.surface,
  },
  freqChipSelected: { borderColor: colors.border, backgroundColor: colors.accent + '30' },
  freqText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: 'SpaceMono_400Regular' },
  freqTextSelected: { color: colors.text, fontWeight: '700', fontFamily: 'SpaceMono_700Bold' },
  receiptPreview: { position: 'relative', marginBottom: spacing.lg },
  receiptCard: { overflow: 'hidden' },
  receiptImage: { width: '100%', height: 200, borderRadius: borderRadius.md - 2 },
  receiptRemoveBtn: { position: 'absolute', top: -8, right: -8, width: 32, height: 32 },
  receiptPlaceholder: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl,
    borderWidth: 2.5, borderColor: colors.border + '30', borderStyle: 'dashed',
    borderRadius: borderRadius.md, backgroundColor: colors.surface, marginBottom: spacing.lg, gap: spacing.xs,
  },
  receiptPlaceholderText: { ...typography.bodySmall, color: colors.textLight },
  modeToggle: {
    flexDirection: 'row', borderWidth: 2.5, borderColor: colors.border,
    borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.xl,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: spacing.sm, backgroundColor: colors.surface,
  },
  modeBtnExpenseActive: { backgroundColor: colors.cardTintPink },
  modeBtnIncomeActive: { backgroundColor: colors.cardTintGreen },
  modeBtnText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, fontFamily: 'SpaceMono_700Bold' },
  modeBtnTextActive: { color: colors.text },
  freeHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: -spacing.md, marginBottom: spacing.xl },
  freeHintText: { ...typography.caption, color: colors.textLight },
  templateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 2.5, borderRadius: borderRadius.md, backgroundColor: colors.surface,
  },
  templateChipText: { fontSize: 12, fontWeight: '600', color: colors.text, fontFamily: 'SpaceMono_400Regular', maxWidth: 80 },
  templateChipAmount: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, fontFamily: 'SpaceMono_700Bold' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  successCard: { alignItems: 'center', paddingVertical: spacing['3xl'], paddingHorizontal: spacing['4xl'] },
  successTitle: { ...typography.h2, marginBottom: spacing.xs },
  successText: { ...typography.bodySmall },
});
