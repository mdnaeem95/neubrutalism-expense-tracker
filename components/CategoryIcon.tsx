import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '@/lib/theme';

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: number;
  containerSize?: number;
  style?: ViewStyle;
}

export default function CategoryIcon({
  icon,
  color,
  size = 20,
  containerSize = 40,
  style,
}: CategoryIconProps) {
  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 3,
          backgroundColor: color + '25',
        },
        style,
      ]}
    >
      <Ionicons name={icon as any} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
