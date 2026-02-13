import CategoryIcon from '@/components/CategoryIcon';
import { NeuButton, NeuCard, NeuIconButton, NeuInput } from '@/components/ui';
import { useDialog } from '@/contexts/DialogContext';
import { saveReceipt, deleteReceipt } from '@/lib/receipt';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import { borderRadius, PAYMENT_METHODS, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { PaymentMethod } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExpenseDetailScreen() {
  const { colors, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getExpenseById, updateExpense, deleteExpense } = useExpenseStore();
  const { categories } = useCategoryStore();
  const { formatAmount, currencySymbol } = useSettingsStore();
  const { showError, showConfirm, showDialog } = useDialog();

  const expense = useMemo(() => getExpenseById(id), [id]);

  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(expense?.amount.toString() || '');
  const [editDescription, setEditDescription] = useState(expense?.description || '');
  const [editCategory, setEditCategory] = useState(expense?.categoryId || '');
  const [editPayment, setEditPayment] = useState<PaymentMethod>((expense?.paymentMethod as PaymentMethod) || 'cash');
  const [editNotes, setEditNotes] = useState(expense?.notes || '');
  const [editReceiptUri, setEditReceiptUri] = useState(expense?.receiptUri || null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  if (!expense) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <NeuIconButton icon="arrow-left" onPress={() => router.back()} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Expense not found</Text>
        </View>
      </View>
    );
  }

  const imagePickerOptions: ImagePicker.ImagePickerOptions = {
    quality: 0.7,
    allowsEditing: true,
    aspect: [4, 3] as [number, number],
  };

  const handlePickReceipt = () => {
    showDialog({
      title: 'Receipt Photo',
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
              setEditReceiptUri(persistedUri);
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
              setEditReceiptUri(persistedUri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  const handleSave = async () => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      showError('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    // Clean up old receipt if it was replaced or removed
    if (expense.receiptUri && expense.receiptUri !== editReceiptUri) {
      await deleteReceipt(expense.receiptUri);
    }
    updateExpense(id, {
      amount,
      description: editDescription,
      categoryId: editCategory,
      paymentMethod: editPayment,
      notes: editNotes || null,
      receiptUri: editReceiptUri,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsEditing(false);
  };

  const handleDelete = () => {
    showConfirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense?',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (expense.receiptUri) await deleteReceipt(expense.receiptUri);
        deleteExpense(id);
        router.back();
      },
    });
  };

  const category = categories.find((c) => c.id === (isEditing ? editCategory : expense.categoryId));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <NeuIconButton icon="arrow-left" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Expense Detail</Text>
          <View style={styles.headerActions}>
            {!isEditing ? (
              <>
                <NeuIconButton icon="pencil-outline" onPress={() => setIsEditing(true)} bgColor={colors.cardTintYellow} />
                <NeuIconButton icon="delete-outline" onPress={handleDelete} bgColor={colors.cardTintPink} color={colors.secondary} />
              </>
            ) : (
              <NeuIconButton icon="close" onPress={() => setIsEditing(false)} bgColor={colors.cardTintPink} />
            )}
          </View>
        </View>

        {/* Amount */}
        <NeuCard style={styles.amountCard}>
          <View style={styles.categoryHeader}>
            <CategoryIcon icon={category?.icon || 'cube-outline'} color={category?.color || '#9CA3AF'} size={28} containerSize={56} />
            <Text style={styles.catNameBig}>{category?.name || 'Unknown'}</Text>
          </View>
          {isEditing ? (
            <View style={styles.editAmountRow}>
              <Text style={styles.editCurrency}>{currencySymbol}</Text>
              <TextInput
                style={styles.editAmountInput}
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
          ) : (
            <Text style={styles.amountText}>{formatAmount(expense.amount)}</Text>
          )}
          <Text style={styles.dateText}>{format(new Date(expense.date), 'EEEE, MMMM d, yyyy · h:mm a')}</Text>
        </NeuCard>

        {/* Details */}
        {isEditing ? (
          <>
            <NeuInput label="Description" value={editDescription} onChangeText={setEditDescription} placeholder="Description" />
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setEditCategory(cat.id)}
                  style={[styles.catItem, editCategory === cat.id && { backgroundColor: colors.cardTintGray, borderColor: cat.color }]}
                >
                  <MaterialCommunityIcons name={cat.icon as any} size={20} color={cat.color} />
                  <Text style={styles.catItemName} numberOfLines={1}>{cat.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.paymentRow}>
              {PAYMENT_METHODS.map((pm) => (
                <Pressable
                  key={pm.id}
                  onPress={() => setEditPayment(pm.id as PaymentMethod)}
                  style={[styles.paymentItem, editPayment === pm.id && styles.paymentSelected]}
                >
                  <Text style={styles.paymentLabel}>{pm.label}</Text>
                </Pressable>
              ))}
            </View>
            <NeuInput label="Notes" value={editNotes} onChangeText={setEditNotes} placeholder="Notes" multiline numberOfLines={3} />
            <Text style={styles.fieldLabel}>Receipt</Text>
            {editReceiptUri ? (
              <View style={styles.receiptPreview}>
                <NeuCard style={styles.receiptCard} padded={false}>
                  <Image source={{ uri: editReceiptUri }} style={styles.receiptImage} />
                </NeuCard>
                <View style={styles.receiptEditActions}>
                  <NeuIconButton icon="camera-outline" onPress={handlePickReceipt} size={16} bgColor={colors.cardTintBlue} color={colors.blue} style={styles.receiptEditBtn} />
                  <NeuIconButton icon="close" onPress={() => setEditReceiptUri(null)} size={16} bgColor={colors.cardTintPink} color={colors.secondary} style={styles.receiptEditBtn} />
                </View>
              </View>
            ) : (
              <Pressable onPress={handlePickReceipt} style={styles.receiptPlaceholder}>
                <MaterialCommunityIcons name="camera-outline" size={24} color={colors.textLight} />
                <Text style={styles.receiptPlaceholderText}>Add Receipt Photo</Text>
              </Pressable>
            )}
            <NeuButton title="Save Changes" onPress={handleSave} variant="primary" size="lg" fullWidth style={{ marginTop: spacing.md }} />
          </>
        ) : (
          <NeuCard padded={false}>
            {expense.description ? (
              <>
                <DetailRow label="Description" value={expense.description} styles={styles} />
                <View style={styles.divider} />
              </>
            ) : null}
            <DetailRow label="Payment" value={expense.paymentMethod} capitalize styles={styles} />
            <View style={styles.divider} />
            <DetailRow label="Date" value={format(new Date(expense.date), 'MMM d, yyyy')} styles={styles} />
            <View style={styles.divider} />
            <DetailRow label="Time" value={format(new Date(expense.date), 'h:mm a')} styles={styles} />
            {expense.isRecurring === 1 && (
              <>
                <View style={styles.divider} />
                <DetailRow label="Recurring" value={expense.recurringFrequency || 'Yes'} capitalize styles={styles} />
              </>
            )}
            {expense.notes ? (
              <>
                <View style={styles.divider} />
                <DetailRow label="Notes" value={expense.notes} styles={styles} />
              </>
            ) : null}
          </NeuCard>
        )}

        {/* Receipt (view mode) */}
        {!isEditing && expense.receiptUri && (
          <>
            <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>Receipt</Text>
            <Pressable onPress={() => setShowReceiptModal(true)}>
              <NeuCard style={styles.receiptCard} padded={false}>
                <Image source={{ uri: expense.receiptUri }} style={styles.receiptImage} />
                <View style={styles.receiptOverlay}>
                  <MaterialCommunityIcons name="arrow-expand" size={20} color="#FFF" />
                  <Text style={styles.receiptOverlayText}>Tap to view</Text>
                </View>
              </NeuCard>
            </Pressable>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Full-screen receipt modal */}
      <Modal visible={showReceiptModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCloseRow, { paddingTop: insets.top + spacing.sm }]}>
            <NeuIconButton icon="close" onPress={() => setShowReceiptModal(false)} bgColor={colors.surface} />
          </View>
          {expense.receiptUri && (
            <Image source={{ uri: expense.receiptUri }} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function DetailRow({ label, value, capitalize, styles }: { label: string; value: string; capitalize?: boolean; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, capitalize && { textTransform: 'capitalize' }]}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg, gap: spacing.md },
  headerTitle: { ...typography.h3, flex: 1 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { ...typography.body, color: colors.textSecondary },
  amountCard: { alignItems: 'center', marginBottom: spacing.xl },
  categoryHeader: { alignItems: 'center', marginBottom: spacing.md },
  catNameBig: { ...typography.label, color: colors.textSecondary },
  amountText: { ...typography.amount, marginBottom: spacing.xs },
  dateText: { ...typography.caption },
  editAmountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  editCurrency: { fontSize: 28, fontWeight: '800', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  editAmountInput: { fontSize: 36, fontWeight: '800', color: colors.text, minWidth: 100, textAlign: 'center', fontFamily: 'SpaceMono_700Bold' },
  fieldLabel: { ...typography.label, marginBottom: spacing.sm, marginTop: spacing.md },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  catItem: {
    width: '22%', alignItems: 'center', paddingVertical: spacing.sm, borderWidth: 2.5,
    borderColor: colors.border + '30', borderRadius: borderRadius.md, backgroundColor: colors.surface,
  },
  catItemName: { fontSize: 9, fontWeight: '600', color: colors.text, textAlign: 'center', fontFamily: 'SpaceMono_400Regular' },
  paymentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  paymentItem: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderWidth: 2.5,
    borderColor: colors.border + '30', borderRadius: borderRadius.md, backgroundColor: colors.surface,
  },
  paymentSelected: { borderColor: colors.border, backgroundColor: colors.cardTintYellow },
  paymentLabel: { fontSize: 12, fontWeight: '600', color: colors.text, fontFamily: 'SpaceMono_400Regular' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  detailLabel: { ...typography.bodySmall, color: colors.textSecondary },
  detailValue: { ...typography.body, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border + '15', marginHorizontal: spacing.lg },
  receiptPreview: { marginBottom: spacing.md },
  receiptCard: { overflow: 'hidden' },
  receiptImage: { width: '100%', height: 200, borderRadius: borderRadius.md - 2 },
  receiptEditActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  receiptEditBtn: { width: 36, height: 36 },
  receiptPlaceholder: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg,
    borderWidth: 2.5, borderColor: colors.border + '30', borderStyle: 'dashed',
    borderRadius: borderRadius.md, backgroundColor: colors.surface, marginBottom: spacing.md, gap: spacing.xs,
  },
  receiptPlaceholderText: { ...typography.caption, color: colors.textLight },
  receiptOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, backgroundColor: colors.overlayLight,
  },
  receiptOverlayText: { color: '#FFF', fontSize: 12, fontWeight: '600', fontFamily: 'SpaceMono_400Regular' },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlayHeavy, justifyContent: 'center' },
  modalCloseRow: { position: 'absolute', top: 0, left: spacing.xl, zIndex: 10 },
  modalImage: { flex: 1, width: '100%' },
});
