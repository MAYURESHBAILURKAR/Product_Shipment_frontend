import React from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { haptic } from "../../utils/haptics";

const pressInConfig = { damping: 15, stiffness: 300 };
const pressOutConfig = { damping: 15, stiffness: 260 };

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  scale?: number;
  /** Fire light haptic on press */
  hapticFeedback?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Standard pressable with spring scale feedback + optional light haptic.
const PressableComponent = React.forwardRef<
  any,
  PressableScaleProps & { ref?: any }
>(({ scale = 0.97, hapticFeedback = true, onPress, style, children, ...rest }, ref) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scale) }],
  }));

  const handlePress = (e: any) => {
    if (hapticFeedback) haptic("light");
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      ref={ref}
      onPressIn={() => {
        pressed.value = withSpring(1, pressInConfig);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, pressOutConfig);
      }}
      onPress={handlePress}
      style={[style as any, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PressableScale = React.memo(PressableComponent);
