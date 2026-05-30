import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const FallbackScreen: React.FC<{ error: Error; reset: () => void }> = ({ error, reset }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.content}>
        <Text style={[s.icon]}>!</Text>
        <Text style={[s.title, { color: colors.text }]}>{t('errorBoundary.title')}</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          {t('errorBoundary.subtitle')}
        </Text>

        {__DEV__ && (
          <ScrollView style={s.errorBox} horizontal={false}>
            <Text style={[s.errorText, { color: colors.textTertiary }]}>
              {error.message}
            </Text>
          </ScrollView>
        )}

        <TouchableOpacity
          style={[s.button, { backgroundColor: colors.primary }]}
          onPress={reset}
          activeOpacity={0.8}
        >
          <Text style={s.buttonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error.message, info.componentStack);
    }
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      const Fallback = this.props.fallback ?? FallbackScreen;
      return <Fallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  onError?: (error: Error, info: React.ErrorInfo) => void,
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name ?? 'Component'})`;
  return Wrapped;
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  icon: {
    fontSize: 48,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 16,
    width: 72,
    height: 72,
    lineHeight: 72,
    textAlign: 'center',
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#EF4444',
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorBox: {
    maxHeight: 120,
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
