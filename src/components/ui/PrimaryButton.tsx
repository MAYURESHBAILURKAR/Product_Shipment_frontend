import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { ComponentProps } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { palette, radius, spacing } from "../../theme/tokens";
import { PressableScale } from "./PressableScale";

type FeatherName = ComponentProps<typeof Feather>["name"];
type ButtonVariant = "solid" | "gradient" | "danger" | "ghost";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: FeatherName;
  size?: "sm" | "md" | "lg";
  full?: boolean;
}

// Standard action button. Uses plain RN Text children (Tamagui Button's
// `color` prop is one of the RC typing errors we're eliminating).
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "gradient",
  icon,
  size = "md",
  full = true,
}: PrimaryButtonProps) {
  const blocked = disabled || loading;

  const heights = { sm: 38, md: 48, lg: 54 };
  const fonts = { sm: 14, md: 15, lg: 16 };

  const textColor =
    variant === "ghost"
      ? palette.primaryBright
      : variant === "danger"
        ? "#FFFFFF"
        : "#FFFFFF";

  const inner = (
    <View style={[styles.inner, { height: heights[size] }]}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon ? (
            <Feather name={icon} size={size === "sm" ? 14 : 17} color={textColor} />
          ) : null}
          <Text style={[styles.label, { fontSize: fonts[size], color: textColor }]}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  const body =
    variant === "gradient" ? (
      <View style={[styles.gradientWrap, { height: heights[size] }, blocked && styles.blocked]}>
        <LinearGradient
          colors={[palette.primaryDeep, palette.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {inner}
      </View>
    ) : variant === "danger" ? (
      <View style={[styles.danger, { height: heights[size] }, blocked && styles.blocked]}>
        {inner}
      </View>
    ) : variant === "ghost" ? (
      <View style={[styles.ghost, { height: heights[size] }, blocked && styles.blocked]}>
        {inner}
      </View>
    ) : (
      <View style={[styles.solid, { height: heights[size] }, blocked && styles.blocked]}>
        {inner}
      </View>
    );

  return (
    <PressableScale
      onPress={blocked ? undefined : onPress}
      hapticFeedback={!blocked}
      style={{ width: full ? "100%" : undefined, opacity: blocked ? 0.55 : 1 }}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  gradientWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    justifyContent: "center",
  },
  danger: {
    borderRadius: radius.md,
    backgroundColor: `${palette.danger}1F`,
    borderWidth: 1,
    borderColor: `${palette.danger}40`,
    justifyContent: "center",
  },
  ghost: {
    borderRadius: radius.md,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: `${palette.primary}33`,
    justifyContent: "center",
  },
  solid: {
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    justifyContent: "center",
  },
  blocked: { opacity: 0.55 },
  label: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
