import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";

interface SafeErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface SafeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SafeErrorBoundary extends Component<
  SafeErrorBoundaryProps,
  SafeErrorBoundaryState
> {
  constructor(props: SafeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SafeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.warn("[SafeErrorBoundary] Error atrapado en UI:", error, info);
    }
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <View className="items-center justify-center rounded-card border border-brand-border bg-brand-surface p-4">
          <Text className="font-sans text-sm text-brand-muted">
            No se pudo mostrar este elemento.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}
