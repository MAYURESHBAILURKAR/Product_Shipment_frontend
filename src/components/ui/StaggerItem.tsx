import React, { useEffect } from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

interface StaggerItemProps extends ViewProps {
  /** Position in the stagger sequence; delay is capped so long lists don't wait. */
  index?: number;
  /** Base delay per step in ms */
  stepMs?: number;
  /** Max index considered for delay (virtualized list safety cap) */
  maxIndex?: number;
  /** Vertical travel in px */
  travelY?: number;
}

const springConfig = { damping: 18, stiffness: 120 };

// Fade+rise entrance with capped stagger. Runs once on mount.
export function StaggerItem({
  index = 0,
  stepMs = 55,
  maxIndex = 8,
  travelY = 16,
  style,
  children,
  ...rest
}: StaggerItemProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const delay = Math.min(index, maxIndex) * stepMs;
    progress.value = withDelay(delay, withSpring(1, springConfig));
  }, [index, stepMs, maxIndex, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * travelY }],
  }));

  return (
    <Animated.View style={[styles.base, animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { opacity: 0 },
});

// Re-export for convenience in list renderers.
export const AnimatedView = Animated.View;
export type { ViewProps };
