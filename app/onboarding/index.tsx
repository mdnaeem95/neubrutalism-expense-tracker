import { NeuButton, NeuCard } from '@/components/ui';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import { spacing } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getOnboardingSteps(colors: ThemeColors) {
  return [
    {
      icon: 'wallet-outline' as const,
      title: 'Track Every Penny',
      description: 'Easily log your daily expenses with just a few taps. Stay on top of where your money goes.',
      color: colors.primary,
    },
    {
      icon: 'flag-outline' as const,
      title: 'Set Budgets & Goals',
      description: 'Create monthly budgets for each category and get alerts when you\'re close to your limit.',
      color: colors.accent,
    },
    {
      icon: 'chart-bar' as const,
      title: 'Understand Your Spending',
      description: 'Beautiful charts and analytics help you visualize spending patterns and make smarter decisions.',
      color: colors.secondary,
    },
  ];
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const { completeOnboarding } = useSettingsStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const ONBOARDING_STEPS = useMemo(() => getOnboardingSteps(colors), [colors]);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const renderItem = ({ item, index }: { item: typeof ONBOARDING_STEPS[0]; index: number }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <MotiView
        from={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: currentIndex === index ? 1 : 0.5, opacity: currentIndex === index ? 1 : 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      >
        <NeuCard style={styles.iconCard}>
          <MaterialCommunityIcons name={item.icon} size={56} color={item.color} />
        </NeuCard>
      </MotiView>

      <MotiView
        from={{ translateY: 30, opacity: 0 }}
        animate={{ translateY: currentIndex === index ? 0 : 30, opacity: currentIndex === index ? 1 : 0 }}
        transition={{ type: 'timing', duration: 500, delay: 200 }}
      >
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </MotiView>
    </View>
  );

  const isLast = currentIndex === ONBOARDING_STEPS.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip Button */}
      <View style={styles.header}>
        {!isLast ? (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_STEPS}
        renderItem={renderItem}
        keyExtractor={(_, i) => i.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.flatList}
      />

      {/* Dots & Button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {ONBOARDING_STEPS.map((step, i) => (
            <MotiView
              key={i}
              animate={{
                width: currentIndex === i ? 28 : 10,
                backgroundColor: currentIndex === i ? step.color : colors.border + '30',
              }}
              transition={{ type: 'timing', duration: 300 }}
              style={styles.dot}
            />
          ))}
        </View>

        <NeuButton
          title={isLast ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginTop: spacing['2xl'] }}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  skipButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  skipText: { ...typography.body, fontWeight: '700', color: colors.textSecondary },
  flatList: { flex: 1 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'] },
  iconCard: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: spacing['3xl'] },
  title: { ...typography.h1, textAlign: 'center', marginBottom: spacing.md },
  description: { ...typography.body, textAlign: 'center', color: colors.textSecondary, lineHeight: 24 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { height: 10, borderRadius: 5, borderWidth: 2.5, borderColor: colors.border },
});
