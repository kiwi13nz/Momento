import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import { useRouter } from 'expo-router';

interface Props {
  children: ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

class RouteErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('RouteErrorBoundary caught error:', {
      route: this.props.routeName,
      error,
      errorInfo,
    });

    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send to error tracking service (Sentry, etc.)
    // logErrorToService(error, errorInfo, this.props.routeName);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          routeName={this.props.routeName}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: any;
  routeName?: string;
  onReset: () => void;
}

function ErrorFallback({ error, errorInfo, routeName, onReset }: ErrorFallbackProps) {
  const router = useRouter();

  const handleGoHome = () => {
    try {
      router.replace('/');
    } catch {
      // If router fails, just reset
      onReset();
    }
  };

  const errorDetails = __DEV__ ? (
    <View style={styles.debugContainer}>
      <View style={styles.debugHeader}>
        <Bug size={16} color={colors.textSecondary} />
        <Text style={styles.debugTitle}>Debug Info</Text>
      </View>
      <ScrollView style={styles.debugScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.debugText}>Route: {routeName || 'Unknown'}</Text>
        <Text style={styles.debugText}>Error: {error?.message}</Text>
        <Text style={styles.debugText}>Stack: {error?.stack}</Text>
        {errorInfo && (
          <Text style={styles.debugText}>
            Component Stack: {errorInfo.componentStack}
          </Text>
        )}
      </ScrollView>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <AlertTriangle size={64} color={colors.error} strokeWidth={1.5} />
        </View>

        {/* Message */}
        <Text style={styles.title}>Something Went Wrong</Text>
        <Text style={styles.message}>
          We hit an unexpected error. Don't worry, your data is safe!
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={onReset}>
            <RefreshCw size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
            <Home size={20} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>

        {/* Debug info (dev only) */}
        {errorDetails}
      </View>
    </View>
  );
}

// Export wrapper component with hooks support
export function RouteErrorBoundary({ children, routeName }: Props) {
  return (
    <RouteErrorBoundaryClass routeName={routeName}>
      {children}
    </RouteErrorBoundaryClass>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.m,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: spacing.m,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.m,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.m,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  debugContainer: {
    width: '100%',
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.m,
    padding: spacing.m,
    maxHeight: 200,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  debugTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  debugScroll: {
    maxHeight: 150,
  },
  debugText: {
    ...typography.small,
    color: colors.textTertiary,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
});