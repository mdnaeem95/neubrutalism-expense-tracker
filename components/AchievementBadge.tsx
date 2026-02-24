import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NeuCard } from '@/components/ui';
import { useTheme } from '@/lib/ThemeContext';
import { spacing } from '@/lib/theme';
import type { ThemeColors, ThemeTypography, ThemeBorders } from '@/lib/theme';
import type { Achievement } from '@/types';

interface AchievementBadgeProps {
  achievement: Achievement;
  style?: ViewStyle;
}

export default function AchievementBadge({ achievement, style }: AchievementBadgeProps) {
  const { colors, typography, borders } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography, borders), [colors, typography, borders]);
  const isEarned = achievement.earned;

  return (
    <NeuCard
      shadow={isEarned ? 'small' : 'small'}
      color={isEarned ? achievement.color + '20' : colors.cardTintGray}
      style={[styles.card, style]}
    >
      <View style={[styles.iconCircle, { backgroundColor: isEarned ? achievement.color + '30' : colors.textLight + '20' }]}>
        <MaterialCommunityIcons
          name={achievement.icon as any}
          size={24}
          color={isEarned ? achievement.color : colors.textLight}
        />
      </View>
      <Text style={[styles.title, !isEarned && { color: colors.textLight }]} numberOfLines={1}>
        {achievement.title}
      </Text>
      <Text style={[styles.description, !isEarned && { color: colors.textLight }]} numberOfLines={2}>
        {achievement.description}
      </Text>
      {isEarned && (
        <View style={[styles.earnedBadge, { backgroundColor: achievement.color + '30' }]}>
          <MaterialCommunityIcons name="check" size={10} color={achievement.color} />
        </View>
      )}
    </NeuCard>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography, borders: ThemeBorders) =>
  StyleSheet.create({
    card: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      flex: 1,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.label,
      fontSize: 11,
      letterSpacing: 1,
      textAlign: 'center',
      marginBottom: 2,
    },
    description: {
      ...typography.caption,
      fontSize: 10,
      textAlign: 'center',
      textTransform: 'none',
    },
    earnedBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
