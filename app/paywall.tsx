import { NeuButton, NeuCard, NeuIconButton } from '@/components/ui';
import { useDialog } from '@/contexts/DialogContext';
import type { ThemeBorders, ThemeColors, ThemeTypography } from '@/lib/theme';
import { borderRadius, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { OFFERINGS, PREMIUM_FEATURES, purchaseMonthly, purchaseYearly, restorePurchases } from '@/services/subscriptions';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, borders, shadows, typography } = useTheme();
  const { setPremium } = useSubscriptionStore();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const { showSuccess, showError, showDialog } = useDialog();
  const [isLoading, setIsLoading] = useState(false);

  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const success = selectedPlan === 'yearly' ? await purchaseYearly() : await purchaseMonthly();
      if (success) {
        await setPremium(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showSuccess('Welcome to Pro!', 'You now have access to all premium features.', () => router.back());
      }
    } catch {
      showError('Error', 'Purchase failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      const success = await restorePurchases();
      if (success) {
        await setPremium(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showSuccess('Restored!', 'Your premium access has been restored.', () => router.back());
      } else {
        showDialog({
          title: 'No Purchases Found',
          message: 'No previous purchases were found to restore.',
          icon: 'information-outline',
          iconColor: colors.electricBlue,
          buttons: [{ text: 'OK', style: 'default' }],
        });
      }
    } catch {
      showError('Error', 'Restore failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Close Button */}
      <View style={styles.headerRow}>
        <NeuIconButton icon="close" onPress={() => router.back()} />
      </View>

      {/* Hero */}
      <MotiView from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 20, stiffness: 150 }}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="star" size={48} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Go Pro</Text>
          <Text style={styles.heroSubtitle}>Unlock the full expense tracking experience</Text>
        </View>
      </MotiView>

      {/* Features */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 200 }}>
        <NeuCard style={styles.featuresCard}>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <MaterialCommunityIcons name={feature.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
              <MaterialCommunityIcons name="check-circle" size={20} color={colors.green} />
            </View>
          ))}
        </NeuCard>
      </MotiView>

      {/* Pricing Plans */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 400 }}>
        <Text style={styles.plansTitle}>Choose Your Plan</Text>
        <View style={styles.plansRow}>
          {/* Monthly */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPlan('monthly'); }}
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
          >
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>{OFFERINGS.monthly.price}</Text>
            <Text style={styles.planPeriod}>per month</Text>
          </Pressable>

          {/* Yearly */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPlan('yearly'); }}
            style={[styles.planCard, styles.planCardYearly, selectedPlan === 'yearly' && styles.planCardSelected]}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save {OFFERINGS.yearly.savings}</Text>
            </View>
            <Text style={styles.planName}>Yearly</Text>
            <Text style={styles.planPrice}>{OFFERINGS.yearly.price}</Text>
            <Text style={styles.planPeriod}>per year</Text>
          </Pressable>
        </View>
      </MotiView>

      {/* Purchase Button */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 600 }}>
        <NeuButton
          title={isLoading ? 'Processing...' : `Subscribe ${selectedPlan === 'yearly' ? OFFERINGS.yearly.price + '/yr' : OFFERINGS.monthly.price + '/mo'}`}
          onPress={handlePurchase}
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        />

        <Pressable onPress={handleRestore} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </Pressable>

        <Text style={styles.legalText}>
          Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Manage your subscription in your App Store settings.
        </Text>
      </MotiView>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  headerRow: { flexDirection: 'row', marginTop: spacing.sm, marginBottom: spacing.md },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  heroIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  heroTitle: { ...typography.h1, fontSize: 40 },
  heroSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  featuresCard: { marginBottom: spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  featureIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureTitle: { ...typography.body, fontWeight: '700' },
  featureDesc: { ...typography.caption },
  plansTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.md },
  plansRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  planCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.md,
    borderWidth: borders.width, borderColor: colors.border + '30', borderRadius: borderRadius.lg,
    backgroundColor: colors.surface, position: 'relative',
  },
  planCardYearly: { borderColor: colors.primary },
  planCardSelected: {
    borderColor: colors.border, backgroundColor: colors.cardTintCream,
    shadowColor: colors.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
  },
  saveBadge: {
    position: 'absolute', top: -10, backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full,
    borderWidth: 2.5, borderColor: colors.border,
  },
  saveBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', fontFamily: 'SpaceMono_700Bold' },
  planName: { ...typography.label, marginBottom: spacing.xs },
  planPrice: { fontSize: 28, fontWeight: '800', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  planPeriod: { ...typography.caption },
  restoreButton: { alignItems: 'center', paddingVertical: spacing.lg },
  restoreText: { ...typography.body, fontWeight: '600', color: colors.electricBlue },
  legalText: { ...typography.caption, textAlign: 'center', color: colors.textLight, lineHeight: 18 },
});
