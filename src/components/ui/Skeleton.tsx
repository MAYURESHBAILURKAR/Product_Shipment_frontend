import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { palette } from "../../theme/tokens";

interface SkeletonProps {
  width?: number | `${string}` | "100%";
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Base shimmer block — a soft elevated surface with a lighter sheen
// sweeping left→right on an infinite loop.
export function Skeleton({
  width = "100%",
  height = 14,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true,
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + shimmer.value * 0.45,
    transform: [{ translateX: (shimmer.value - 0.5) * 24 }],
  }));

  return (
    <View
      style={[
        styles.track,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius },
          styles.sheen,
          animatedStyle,
        ]}
      />
    </View>
  );
}

// Matches the ListRow layout so loading states are 1:1 with content.
export function SkeletonListRow() {
  return (
    <View style={styles.row}>
      <View style={styles.avatar} />
      <View style={styles.rowText}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={11} style={styles.gap} />
      </View>
      <Skeleton width={44} height={22} borderRadius={11} />
    </View>
  );
}

// Matches StatCard dimensions for dashboard loading states.
export function SkeletonCard({ width = 160 }: { width?: number }) {
  return (
    <View style={[styles.card, { width }]}>
      <Skeleton width={36} height={36} borderRadius={10} />
      <View style={styles.cardBottom}>
        <Skeleton width="70%" height={11} />
        <Skeleton width="50%" height={22} style={styles.gap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: palette.surfaceElevated,
    overflow: "hidden",
  },
  sheen: {
    backgroundColor: palette.surfaceHighest,
    marginHorizontal: -8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surfaceElevated,
  },
  rowText: { flex: 1, gap: 8 },
  card: {
    width: 160,
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 16,
    justifyContent: "space-between",
  },
  cardBottom: { gap: 8 },
  gap: { marginTop: 4 },
});
