import { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppScreenProps extends ScrollViewProps {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}

export function AppScreen({
  title,
  subtitle,
  headerRight,
  children,
  refreshing = false,
  onRefresh,
  scroll = true,
  contentContainerStyle,
  ...props
}: AppScreenProps) {
  const insets = useSafeAreaInsets();

  const header = title ? (
    <View className="mb-6 flex-row items-start justify-between gap-4">
      <View className="flex-1 gap-1">
        <Text className="font-sans-bold text-3xl text-white">{title}</Text>
        {subtitle ? (
          <Text className="font-sans text-base text-brand-muted">{subtitle}</Text>
        ) : null}
      </View>
      {headerRight}
    </View>
  ) : null;

  const content = (
    <>
      {header}
      {children}
    </>
  );

  if (!scroll) {
    return (
      <View
        className="flex-1 bg-brand-black px-6"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-brand-black"
      contentContainerStyle={[
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        },
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#CBFE01"
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {content}
    </ScrollView>
  );
}
