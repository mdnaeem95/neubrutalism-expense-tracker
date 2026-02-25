import React, { Component, ErrorInfo, useMemo } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, createTheme } from '@/lib/theme';
import { NeuButton } from '@/components/ui';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const themeSetting = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const { colors } = useMemo(() => {
    let mode: 'light' | 'dark' = 'light';
    if (themeSetting === 'dark') mode = 'dark';
    else if (themeSetting === 'system') mode = systemScheme === 'dark' ? 'dark' : 'light';
    return createTheme(mode);
  }, [themeSetting, systemScheme]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.secondary + '15' }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.secondary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Oops! Something went wrong</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {error?.message || 'An unexpected error occurred'}
      </Text>
      <NeuButton title="Try Again" onPress={onReset} variant="primary" />
    </View>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24, fontWeight: '700' as const, lineHeight: 32, fontFamily: 'SpaceMono_700Bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14, fontWeight: '400' as const, lineHeight: 20, fontFamily: 'SpaceMono_400Regular',
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
});
