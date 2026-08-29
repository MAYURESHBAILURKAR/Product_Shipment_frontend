import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";
import { palette, radius, shadow } from "../../theme/tokens";

interface GlassCardProps {
  children: React.ReactNode;
  padding?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Frosted glass surface — BlurView on iOS, translucent elevated
// surface on Android (BlurView there is expensive/uneven).
export function GlassCard({
  children,
  padding = 20,
  borderRadius = radius.lg,
  style,
}: GlassCardProps) {
  if (Platform.OS === "ios") {
    return (
      <View style={[styles.iosWrap, { borderRadius }, style]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.iosBorder} />
        <View style={[styles.inner, { padding }]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.androidCard, { borderRadius, padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  iosWrap: {
    overflow: "hidden",
    ...shadow(3),
  },
  iosBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inner: { backgroundColor: "transparent" },
  androidCard: {
    backgroundColor: palette.glass,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow(2),
  },
});
