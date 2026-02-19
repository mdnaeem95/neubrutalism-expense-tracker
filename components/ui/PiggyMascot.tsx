import React, { memo, useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import PiggyBank from './PiggyBank';
import SpeechBubble from './SpeechBubble';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { spacing } from '@/lib/theme';
import type { PiggyMood, PiggySize } from '@/types';

type MascotContext = 'dashboard' | 'success' | 'empty' | 'milestone';

interface PiggyMascotProps {
  context: MascotContext;
  size?: PiggySize;
  streakCount?: number;
  budgetPercentage?: number;
  milestoneCount?: number;
  style?: ViewStyle;
}

function getMascotState(
  context: MascotContext,
  streakCount?: number,
  budgetPercentage?: number,
  milestoneCount?: number,
): { mood: PiggyMood; message: string } {
  switch (context) {
    case 'dashboard': {
      const hour = new Date().getHours();
      if (streakCount && streakCount >= 7) return { mood: 'proud', message: `${streakCount} day streak! On fire!` };
      if (streakCount && streakCount >= 3) return { mood: 'excited', message: `${streakCount} day streak! Keep going!` };
      if (budgetPercentage && budgetPercentage > 90) return { mood: 'worried', message: 'Budget is almost gone!' };
      if (budgetPercentage && budgetPercentage > 80) return { mood: 'worried', message: 'Getting close to budget...' };
      if (hour < 12) return { mood: 'happy', message: 'Good morning! Ready to track?' };
      if (hour < 18) return { mood: 'happy', message: 'Good afternoon!' };
      return { mood: 'happy', message: 'Good evening!' };
    }
    case 'success':
      return { mood: 'excited', message: 'Nice! Expense saved!' };
    case 'milestone':
      return { mood: 'proud', message: `Wow! ${milestoneCount} expenses tracked!` };
    case 'empty':
      return { mood: 'encouraging', message: "Let's log your first expense!" };
  }
}

function PiggyMascot({ context, size = 'medium', streakCount, budgetPercentage, milestoneCount, style }: PiggyMascotProps) {
  const mascotEnabled = useSettingsStore((s) => s.mascotEnabled);

  const { mood, message } = useMemo(
    () => getMascotState(context, streakCount, budgetPercentage, milestoneCount),
    [context, streakCount, budgetPercentage, milestoneCount],
  );

  if (!mascotEnabled) return null;

  const isLarge = size === 'large';

  return (
    <View style={[
      {
        flexDirection: isLarge ? 'column' : 'row',
        alignItems: 'center',
        gap: isLarge ? spacing.md : spacing.xs,
      },
      style,
    ]}>
      <PiggyBank mood={mood} size={size} />
      <SpeechBubble message={message} position={isLarge ? 'below' : 'right'} />
    </View>
  );
}

export default memo(PiggyMascot);
