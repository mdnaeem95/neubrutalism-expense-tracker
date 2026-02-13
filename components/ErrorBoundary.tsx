import React, { Component, ErrorInfo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { lightColors, spacing } from '@/lib/theme';
import { NeuButton } from '@/components/ui';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
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
      return (
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={lightColors.secondary} />
          </View>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <NeuButton
            title="Try Again"
            onPress={this.handleReset}
            variant="primary"
          />
        </View>
      );
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
    backgroundColor: lightColors.background,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: lightColors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24, fontWeight: '700' as const, lineHeight: 32, color: lightColors.text, fontFamily: 'SpaceMono_700Bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14, fontWeight: '400' as const, lineHeight: 20, color: lightColors.textSecondary, fontFamily: 'SpaceMono_400Regular',
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
});
