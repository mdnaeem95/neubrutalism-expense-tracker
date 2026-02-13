import React, { useMemo } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeBorders } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const TAB_CONFIG = [
  { name: 'index', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'expenses', label: 'Expenses', icon: 'format-list-bulleted', iconActive: 'format-list-bulleted' },
  { name: 'add', label: 'Add', icon: 'plus', iconActive: 'plus' },
  { name: 'analytics', label: 'Analytics', icon: 'chart-pie', iconActive: 'chart-pie' },
  { name: 'settings', label: 'Settings', icon: 'cog-outline', iconActive: 'cog' },
];

function TabButton({
  route,
  index,
  isFocused,
  onPress,
  config,
}: {
  route: any;
  index: number;
  isFocused: boolean;
  onPress: () => void;
  config: (typeof TAB_CONFIG)[number];
}) {
  const { colors, borders } = useTheme();
  const isCenter = config.name === 'add';
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (isCenter) {
    return (
      <AnimatedPressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        onPressIn={() => { scale.value = withTiming(0.9, { duration: 80 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 100 }); }}
        style={[
          {
            width: 52,
            height: 52,
            borderRadius: borderRadius.lg,
            backgroundColor: colors.primary,
            borderWidth: borders.medium,
            borderColor: borders.color,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            marginTop: -24,
            shadowColor: colors.border,
            shadowOffset: { width: 3, height: 3 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
          },
          animStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.onPrimary} />
      </AnimatedPressable>
    );
  }

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={staticStyles.tabButton}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={config.label}
    >
      <MaterialCommunityIcons
        name={isFocused ? (config.iconActive as any) : (config.icon as any)}
        size={22}
        color={isFocused ? colors.text : colors.textLight}
      />
      <Text style={{
        fontSize: 10,
        fontWeight: isFocused ? '700' : '600',
        fontFamily: 'SpaceMono_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: isFocused ? colors.text : colors.textLight,
        marginTop: 2,
      }}>
        {config.label}
      </Text>
      {isFocused && (
        <View style={{
          position: 'absolute',
          bottom: -4,
          width: 20,
          height: 3,
          backgroundColor: colors.primary,
          borderRadius: 2,
        }} />
      )}
    </Pressable>
  );
}

export default function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, borders } = useTheme();
  const styles = useMemo(() => createStyles(colors, borders), [colors, borders]);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const config = TAB_CONFIG[index];
          if (!config) return null;

          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={route.key}
              route={route}
              index={index}
              isFocused={isFocused}
              onPress={onPress}
              config={config}
            />
          );
        })}
      </View>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    position: 'relative',
  },
});

const createStyles = (colors: ThemeColors, borders: ThemeBorders) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: borders.medium,
      borderColor: borders.color,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      shadowColor: colors.border,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 0,
      alignItems: 'center',
    },
  });
