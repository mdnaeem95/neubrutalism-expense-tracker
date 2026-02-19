import React, { memo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '@/lib/ThemeContext';
import type { PiggyMood, PiggySize } from '@/types';

interface PiggyBankProps {
  mood?: PiggyMood;
  size?: PiggySize;
}

const SIZE_SCALE: Record<PiggySize, number> = { small: 0.5, medium: 1.0, large: 1.5 };

function PiggyBank({ mood = 'happy', size = 'medium' }: PiggyBankProps) {
  const { colors, isDark } = useTheme();
  const scale = SIZE_SCALE[size];
  const s = (v: number) => v * scale;

  const bodyColor = colors.primary;
  const earColor = isDark ? '#D4507E' : '#E8568A';
  const snoutColor = isDark ? '#FFC7D9' : '#FFB3CC';
  const cheekColor = isDark ? 'rgba(255,143,184,0.3)' : 'rgba(255,143,184,0.4)';
  const borderColor = colors.border;
  const eyeWhite = colors.surface;
  const borderW = Math.max(s(2.5), 1.5);

  return (
    <MotiView
      from={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 18, stiffness: 160 }}
      style={{ width: s(80), height: s(90), alignItems: 'center' }}
    >
      {/* Ears — behind head */}
      <View style={{ position: 'absolute', top: s(2), left: s(10), flexDirection: 'row', justifyContent: 'space-between', width: s(60), zIndex: 0 }}>
        <View style={{
          width: s(16), height: s(16), borderRadius: s(8), backgroundColor: earColor,
          borderWidth: borderW, borderColor, transform: [{ rotate: '-20deg' }],
        }} />
        <View style={{
          width: s(16), height: s(16), borderRadius: s(8), backgroundColor: earColor,
          borderWidth: borderW, borderColor, transform: [{ rotate: '20deg' }],
        }} />
      </View>

      {/* Head */}
      <View style={{
        width: s(52), height: s(48), borderRadius: s(26), backgroundColor: bodyColor,
        borderWidth: borderW, borderColor, zIndex: 1, alignItems: 'center', justifyContent: 'center',
        marginTop: s(8),
      }}>
        {/* Eyebrows — worried only */}
        {mood === 'worried' && (
          <View style={{ position: 'absolute', top: s(6), flexDirection: 'row', gap: s(14) }}>
            <View style={{ width: s(10), height: borderW, backgroundColor: borderColor, transform: [{ rotate: '-20deg' }] }} />
            <View style={{ width: s(10), height: borderW, backgroundColor: borderColor, transform: [{ rotate: '20deg' }] }} />
          </View>
        )}

        {/* Eyes */}
        <View style={{ flexDirection: 'row', gap: s(12), marginTop: s(-4) }}>
          <EyeView mood={mood} s={s} eyeWhite={eyeWhite} borderColor={borderColor} borderW={borderW} />
          <EyeView mood={mood} s={s} eyeWhite={eyeWhite} borderColor={borderColor} borderW={borderW} />
        </View>

        {/* Cheeks */}
        <View style={{ position: 'absolute', top: s(18), left: s(4), width: s(10), height: s(7), borderRadius: s(5), backgroundColor: cheekColor }} />
        <View style={{ position: 'absolute', top: s(18), right: s(4), width: s(10), height: s(7), borderRadius: s(5), backgroundColor: cheekColor }} />

        {/* Snout */}
        <View style={{
          width: s(22), height: s(14), borderRadius: s(7), backgroundColor: snoutColor,
          borderWidth: borderW, borderColor, marginTop: s(2),
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(5),
        }}>
          <View style={{ width: s(3), height: s(3), borderRadius: s(1.5), backgroundColor: borderColor }} />
          <View style={{ width: s(3), height: s(3), borderRadius: s(1.5), backgroundColor: borderColor }} />
        </View>

        {/* Mouth */}
        <MouthView mood={mood} s={s} borderColor={borderColor} borderW={borderW} />
      </View>

      {/* Body */}
      <MotiView
        animate={mood === 'excited' ? { translateY: [-2, 0] } : { translateY: 0 }}
        transition={mood === 'excited' ? { type: 'timing', duration: 400, loop: true } : { type: 'timing', duration: 200 }}
        style={{
          width: s(58), height: s(32), borderRadius: s(16), backgroundColor: bodyColor,
          borderWidth: borderW, borderColor, marginTop: s(-6), zIndex: 0,
          alignItems: 'center',
        }}
      >
        {/* Coin slot */}
        <View style={{
          width: s(16), height: s(4), borderRadius: s(2), backgroundColor: borderColor,
          marginTop: s(3),
        }} />
      </MotiView>

      {/* Legs */}
      <View style={{ flexDirection: 'row', gap: s(4), marginTop: s(-3), zIndex: -1 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{
            width: s(10), height: s(8), borderRadius: s(3),
            backgroundColor: bodyColor, borderWidth: borderW, borderColor,
          }} />
        ))}
      </View>

      {/* Mood extras */}
      {mood === 'sleeping' && <SleepingZzz s={s} borderColor={borderColor} />}
      {mood === 'proud' && <Sparkles s={s} colors={colors} />}
    </MotiView>
  );
}

function EyeView({ mood, s, eyeWhite, borderColor, borderW }: {
  mood: PiggyMood; s: (v: number) => number; eyeWhite: string; borderColor: string; borderW: number;
}) {
  if (mood === 'sleeping') {
    return <View style={{ width: s(8), height: borderW, backgroundColor: borderColor, borderRadius: borderW }} />;
  }

  const eyeSize = mood === 'excited' ? s(12) : s(10);
  const pupilSize = mood === 'excited' ? s(5) : s(4);

  return (
    <View style={{
      width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2,
      backgroundColor: eyeWhite, borderWidth: borderW, borderColor,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <MotiView
        animate={{ scale: mood === 'excited' ? 1.2 : 1 }}
        transition={{ type: 'spring', damping: 15 }}
        style={{
          width: pupilSize, height: pupilSize, borderRadius: pupilSize / 2,
          backgroundColor: borderColor,
        }}
      />
    </View>
  );
}

function MouthView({ mood, s, borderColor, borderW }: {
  mood: PiggyMood; s: (v: number) => number; borderColor: string; borderW: number;
}) {
  if (mood === 'sleeping') return null;

  if (mood === 'excited') {
    return (
      <View style={{
        width: s(8), height: s(6), borderRadius: s(4),
        backgroundColor: borderColor, marginTop: s(1),
      }} />
    );
  }

  if (mood === 'worried') {
    return (
      <View style={{
        width: s(10), height: s(5), borderBottomLeftRadius: s(5),
        borderBottomRightRadius: s(5), borderBottomWidth: borderW,
        borderLeftWidth: borderW, borderRightWidth: borderW,
        borderColor, marginTop: s(1), transform: [{ rotate: '180deg' }],
      }} />
    );
  }

  // happy, proud, encouraging — smile
  return (
    <View style={{
      width: s(10), height: s(5), borderBottomLeftRadius: s(5),
      borderBottomRightRadius: s(5), borderBottomWidth: borderW,
      borderLeftWidth: borderW, borderRightWidth: borderW,
      borderColor, marginTop: s(1),
    }} />
  );
}

function SleepingZzz({ s, borderColor }: { s: (v: number) => number; borderColor: string }) {
  return (
    <View style={{ position: 'absolute', top: s(-2), right: s(2) }}>
      {[0, 1, 2].map((i) => (
        <MotiView
          key={i}
          from={{ opacity: 0, translateY: 0 }}
          animate={{ opacity: [0, 1, 0], translateY: -s(8) }}
          transition={{ type: 'timing', duration: 1500, delay: i * 400, loop: true }}
          style={{ position: 'absolute', right: i * s(6), top: -i * s(6) }}
        >
          <Text style={{
            fontSize: s(8 + i * 2), fontWeight: '800', color: borderColor,
            fontFamily: 'SpaceMono_700Bold',
          }}>z</Text>
        </MotiView>
      ))}
    </View>
  );
}

function Sparkles({ s, colors }: { s: (v: number) => number; colors: any }) {
  const sparkleColors = [colors.accent, colors.primary, colors.green];
  return (
    <>
      {[
        { top: s(-5), left: s(0), delay: 0 },
        { top: s(5), right: s(-2), delay: 200 },
        { top: s(-2), right: s(5), delay: 400 },
      ].map((pos, i) => (
        <MotiView
          key={i}
          from={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ type: 'timing', duration: 1200, delay: pos.delay, loop: true }}
          style={{
            position: 'absolute', ...pos,
            width: s(6), height: s(6),
            backgroundColor: sparkleColors[i % sparkleColors.length],
            transform: [{ rotate: '45deg' }],
          }}
        />
      ))}
    </>
  );
}

export default memo(PiggyBank);
