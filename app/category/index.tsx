import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useDialog } from '@/contexts/DialogContext';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { NeuCard, NeuButton, NeuIconButton } from '@/components/ui';
import CategoryIcon from '@/components/CategoryIcon';
import { spacing, borderRadius, CATEGORY_ICON_OPTIONS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
const COLOR_OPTIONS = ['#FF6B6B', '#60A5FA', '#A855F7', '#FF69B4', '#FFD60A', '#34D399', '#4ECDC4', '#FB923C', '#9CA3AF', '#EF4444'];

export default function CategoryManagementScreen() {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { categories, addCategory, deleteCategory } = useCategoryStore();
  const { isPremium } = useSubscriptionStore();

  const { showError, showConfirm, showDialog } = useDialog();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('cube-outline');
  const [newColor, setNewColor] = useState('#FF6B6B');

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const handleAdd = () => {
    if (!newName.trim()) {
      showError('Error', 'Please enter a category name.');
      return;
    }
    addCategory({ name: newName.trim(), icon: newIcon, color: newColor });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewName('');
    setNewIcon('cube-outline');
    setNewColor('#FF6B6B');
    setShowAdd(false);
  };

  const handleDelete = (id: string, name: string, isDefault: number) => {
    if (isDefault) {
      showDialog({
        title: 'Cannot Delete',
        message: 'Default categories cannot be deleted.',
        icon: 'information-circle-outline',
        iconColor: colors.blue,
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }
    showConfirm({
      title: 'Delete Category',
      message: `Delete "${name}"? Expenses in this category will need to be reassigned.`,
      onConfirm: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        deleteCategory(id);
      },
    });
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <NeuIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Categories</Text>
        <NeuIconButton
          icon="add"
          onPress={() => {
            if (!isPremium && categories.length >= 8) {
              router.push('/paywall');
              return;
            }
            setShowAdd(!showAdd);
          }}
          bgColor={colors.primary}
          color={colors.onPrimary}
        />
      </View>

      {/* Add New Category Form */}
      {showAdd && (
        <MotiView from={{ opacity: 0, translateY: -20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <NeuCard color={colors.cardTintCream} style={styles.addCard}>
            <Text style={styles.addTitle}>New Category</Text>
            <View style={styles.nameRow}>
              <View style={[styles.previewIconWrap, { backgroundColor: newColor + '20' }]}>
                <Ionicons name={newIcon as any} size={22} color={newColor} />
              </View>
              <TextInput
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Category name"
                placeholderTextColor={colors.textLight}
                autoFocus
              />
            </View>

            <Text style={styles.pickerLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {CATEGORY_ICON_OPTIONS.map((iconName) => (
                <Pressable
                  key={iconName}
                  onPress={() => setNewIcon(iconName)}
                  style={[styles.iconItem, newIcon === iconName && styles.iconSelected]}
                >
                  <Ionicons name={iconName as any} size={20} color={newIcon === iconName ? newColor : colors.textSecondary} />
                </Pressable>
              ))}
            </View>

            <Text style={styles.pickerLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setNewColor(color)}
                  style={[styles.colorItem, { backgroundColor: color }, newColor === color && styles.colorSelected]}
                />
              ))}
            </View>

            <View style={styles.addActions}>
              <NeuButton title="Cancel" onPress={() => setShowAdd(false)} variant="outline" size="sm" />
              <NeuButton title="Add Category" onPress={handleAdd} variant="primary" size="sm" />
            </View>
          </NeuCard>
        </MotiView>
      )}

      {/* Category List */}
      {categories.map((cat, index) => (
        <MotiView
          key={cat.id}
          from={{ opacity: 0, translateX: -20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 300, delay: index * 50 }}
        >
          <NeuCard style={styles.catCard}>
            <View style={styles.catRow}>
              <CategoryIcon icon={cat.icon} color={cat.color} size={22} containerSize={44} />
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{cat.name}</Text>
                {cat.isDefault === 1 && (
                  <Text style={styles.catDefault}>Default</Text>
                )}
              </View>
              <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
              {cat.isDefault === 0 && (
                <NeuIconButton
                  icon="trash-outline"
                  onPress={() => handleDelete(cat.id, cat.name, cat.isDefault)}
                  size={16}
                  bgColor={colors.secondary + '20'}
                  color={colors.secondary}
                  style={styles.deleteBtn}
                />
              )}
            </View>
          </NeuCard>
        </MotiView>
      ))}

      {!isPremium && categories.length >= 8 && (
        <NeuCard color={colors.cardTintPurple} style={styles.limitCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="star" size={16} color={colors.primary} />
            <Text style={styles.limitText}>Upgrade to Pro for unlimited categories</Text>
          </View>
          <NeuButton title="Upgrade" onPress={() => router.push('/paywall')} variant="primary" size="sm" />
        </NeuCard>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl, gap: spacing.md },
  headerTitle: { ...typography.h2, flex: 1 },
  addCard: { marginBottom: spacing.lg },
  addTitle: { ...typography.h3, marginBottom: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  previewIconWrap: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  nameInput: {
    flex: 1, ...typography.body, borderWidth: 2, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface,
  },
  pickerLabel: { ...typography.label, marginBottom: spacing.sm },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  iconItem: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.sm, borderWidth: 2, borderColor: 'transparent' },
  iconSelected: { borderColor: colors.border, backgroundColor: colors.primary + '20' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  colorItem: { width: 32, height: 32, borderRadius: borderRadius.sm, borderWidth: 2, borderColor: 'transparent' },
  colorSelected: { borderColor: colors.border, borderWidth: 3 },
  addActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  catCard: { marginBottom: spacing.sm },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  catInfo: { flex: 1 },
  catName: { ...typography.body, fontWeight: '700' },
  catDefault: { ...typography.caption, color: colors.textLight },
  colorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.border },
  deleteBtn: { width: 36, height: 36 },
  limitCard: { alignItems: 'center', marginTop: spacing.md, gap: spacing.md },
  limitText: { ...typography.bodySmall, fontWeight: '600' },
});
