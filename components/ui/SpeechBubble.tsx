import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, borderRadius } from '@/lib/theme';

interface SpeechBubbleProps {
  message: string;
  position?: 'right' | 'below';
}

function SpeechBubble({ message, position = 'right' }: SpeechBubbleProps) {
  const { colors, borders, typography } = useTheme();
  const borderW = borders.medium;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 100 }}
    >
      <View style={{ flexDirection: position === 'right' ? 'row' : 'column', alignItems: position === 'right' ? 'center' : 'center' }}>
        {/* Tail */}
        {position === 'right' && (
          <View style={{
            width: 8, height: 8, backgroundColor: colors.surface,
            borderLeftWidth: borderW, borderBottomWidth: borderW, borderColor: colors.border,
            transform: [{ rotate: '45deg' }], marginRight: -5, zIndex: 1,
          }} />
        )}
        {position === 'below' && (
          <View style={{
            width: 8, height: 8, backgroundColor: colors.surface,
            borderLeftWidth: borderW, borderTopWidth: borderW, borderColor: colors.border,
            transform: [{ rotate: '45deg' }], marginBottom: -5, zIndex: 1,
          }} />
        )}

        {/* Bubble */}
        <View style={{
          backgroundColor: colors.surface,
          borderWidth: borderW, borderColor: colors.border,
          borderRadius: borderRadius.lg,
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          shadowColor: colors.border, shadowOffset: { width: 2, height: 2 },
          shadowOpacity: 1, shadowRadius: 0, elevation: 0,
          maxWidth: 180,
        }}>
          <Text style={{
            ...typography.bodySmall,
            fontWeight: '600',
            color: colors.text,
          }}>{message}</Text>
        </View>
      </View>
    </MotiView>
  );
}

export default memo(SpeechBubble);
