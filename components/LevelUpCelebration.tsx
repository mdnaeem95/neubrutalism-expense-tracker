import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { NeuButton, NeuBadge } from '@/components/ui';
import { useTheme } from '@/lib/ThemeContext';
import { spacing } from '@/lib/theme';
import { getRankForLevel, getRankColorKey } from '@/types';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';

interface LevelUpCelebrationProps {
  level: number;
  visible: boolean;
  onDismiss: () => void;
}

export default function LevelUpCelebration({ level, visible, onDismiss }: LevelUpCelebrationProps) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const rank = getRankForLevel(level);
  const rankColorKey = getRankColorKey(level);
  const rankColor = (colors as unknown as Record<string, string>)[rankColorKey] ?? colors.primary;

  const confetti = useMemo(() => {
    const confettiColors = [colors.primary, colors.accent, colors.green, colors.secondary, colors.purple];
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 30) * (Math.PI / 180);
      const distance = 70 + (i % 3) * 20;
      return {
        color: confettiColors[i % confettiColors.length],
        delay: 200 + i * 60,
        toX: Math.cos(angle) * distance,
        toY: Math.sin(angle) * distance,
        size: 6 + (i % 3) * 3,
        rotation: `${i * 30}deg`,
      };
    });
  }, [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {/* Confetti */}
        {confetti.map((piece, i) => (
          <MotiView
            key={i}
            from={{ translateX: 0, translateY: 0, opacity: 0, scale: 0 }}
            animate={{ translateX: piece.toX, translateY: piece.toY, opacity: [0, 1, 0.8], scale: 1 }}
            transition={{ type: 'timing', duration: 800, delay: piece.delay }}
            style={styles.confettiWrap}
          >
            <View style={{
              width: piece.size, height: piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.size > 8 ? 2 : piece.size,
              transform: [{ rotate: piece.rotation }],
            }} />
          </MotiView>
        ))}

        {/* Level Number */}
        <MotiView
          from={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 130 }}
          style={styles.levelContainer}
        >
          <Text style={[styles.levelNumber, { color: rankColor }]}>LVL {level}</Text>
          <NeuBadge label={rank} color={rankColor + '30'} textColor={rankColor} size="md" />
        </MotiView>

        {/* Text */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 300 }}
        >
          <Text style={styles.title}>Level Up!</Text>
          <Text style={styles.subtitle}>You are now a {rank}</Text>
        </MotiView>

        {/* Dismiss button */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 500 }}
          style={styles.buttonWrap}
        >
          <NeuButton title="Awesome!" onPress={onDismiss} variant="primary" size="lg" />
        </MotiView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: colors.overlay,
    alignItems: 'center', justifyContent: 'center',
  },
  confettiWrap: {
    position: 'absolute',
  },
  levelContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  levelNumber: {
    ...typography.amount,
    fontSize: 48,
  },
  title: {
    ...typography.h1, color: colors.accent,
    textAlign: 'center', marginTop: spacing.xl,
  },
  subtitle: {
    ...typography.h3, color: '#FFFFFF',
    textAlign: 'center', marginTop: spacing.sm,
  },
  buttonWrap: {
    marginTop: spacing['3xl'], minWidth: 160,
  },
});
