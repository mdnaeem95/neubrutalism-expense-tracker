import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { NeuCard } from '@/components/ui';
import { useTheme } from '@/lib/ThemeContext';
import { spacing } from '@/lib/theme';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import type { Insight } from '@/types';

interface InsightCardProps {
  insight: Insight;
  index?: number;
  style?: ViewStyle;
}

function getInsightTint(insightColor: string, colors: ThemeColors): string {
  // Map insight colors to solid opaque card tints from theme
  switch (insightColor) {
    case '#EF4444': return colors.cardTintRed;
    case '#6BCB77': return colors.cardTintGreen;
    case '#4D96FF': return colors.cardTintBlue;
    case '#FB923C': return colors.cardTintOrange;
    case '#FFD93D': return colors.cardTintYellow;
    case '#A855F7': return colors.cardTintPurple;
    default: return colors.cardTintCream;
  }
}

export default function InsightCard({ insight, index = 0, style }: InsightCardProps) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const tintColor = getInsightTint(insight.color, colors);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: index * 100 }}
    >
      <NeuCard shadow="small" color={tintColor} style={[styles.card, style]}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: insight.color + '30' }]}>
            <MaterialCommunityIcons
              name={insight.icon as any}
              size={18}
              color={insight.color}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{insight.title}</Text>
            <Text style={styles.message} numberOfLines={2}>{insight.message}</Text>
          </View>
        </View>
      </NeuCard>
    </MotiView>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textContainer: {
      flex: 1,
    },
    title: {
      ...typography.label,
      fontSize: 12,
      letterSpacing: 1,
      marginBottom: 2,
    },
    message: {
      ...typography.bodySmall,
      fontSize: 13,
    },
  });
