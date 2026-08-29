import React from "react";
import {
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { palette } from "../../theme/tokens";

interface ScreenProps {
  children: React.ReactNode;
  /** Apply standard horizontal padding */
  padded?: boolean;
  /** Wrap children in a scrollable view */
  scroll?: boolean;
  /** Pull-to-refresh wiring (only with scroll) */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom padding — use on tab screens above the floating tab bar */
  bottomInset?: number;
  scrollViewProps?: Partial<ScrollViewProps>;
}

// Standard screen shell: safe area, background, optional scroll/refresh.
export function Screen({
  children,
  padded = false,
  scroll = false,
  refreshing = false,
  onRefresh,
  bottomInset = 0,
  scrollViewProps,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const contentStyle = {
    paddingHorizontal: padded ? 16 : 0,
    paddingTop: Math.max(insets.top, 16),
    paddingBottom: bottomInset,
    flexGrow: 1,
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.background }}
      edges={["top", "left", "right", "bottom"]}
    >
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.primary}
                colors={[palette.primary]}
              />
            ) : undefined
          }
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: Math.max(insets.top, 16) }}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
