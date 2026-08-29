import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ComponentProps } from "react";
import { ColorValue, StyleSheet, Text, View } from "react-native";
import { palette, radius } from "../../theme/tokens";
import { AnimatedNumber } from "./AnimatedNumber";
import { PressableScale } from "./PressableScale";
import { StaggerItem } from "./StaggerItem";

type FeatherName = ComponentProps<typeof Feather>["name"];
type StatVariant = "gradient" | "glass";
type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

interface StatCardProps {
  icon: FeatherName;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  variant?: StatVariant;
  preset?: "primary" | "success" | "accent";
  index?: number;
  onPress?: () => void;
  width?: number;
}

// Dashboard stat card with animated count-up and staggered entrance.
export function StatCard({
  icon,
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  variant = "gradient",
  preset = "primary",
  index = 0,
  onPress,
  width = 160,
}: StatCardProps) {
  const gradients: Record<string, GradientColors> = {
    primary: palette.gradient.primary,
    success: palette.gradient.success,
    accent: palette.gradient.accent,
  };

  const body = (
    <View style={[styles.card, { width }, variant === "glass" && styles.glass]}>
      {variant === "gradient" && (
        <LinearGradient
          colors={gradients[preset]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.iconWrap}>
        <Feather name={icon} size={20} color={variant === "gradient" ? "#FFFFFF" : palette.primaryBright} />
      </View>
      <View>
        <Text style={[styles.label, variant === "glass" && styles.labelGlass]}>
          {label}
        </Text>
        <AnimatedNumber
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          style={[styles.value, variant === "glass" && styles.valueGlass]}
        />
      </View>
    </View>
  );

  const wrapped = onPress ? (
    <PressableScale onPress={onPress} style={styles.pressWrap}>
      {body}
    </PressableScale>
  ) : (
    body
  );

  return <StaggerItem index={index}>{wrapped}</StaggerItem>;
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    height: 140,
    borderRadius: radius.lg,
    padding: 20,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  glass: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pressWrap: { borderRadius: radius.lg },
  iconWrap: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    padding: 8,
    borderRadius: 10,
  },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "500",
  },
  labelGlass: { color: palette.textSecondary },
  value: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  valueGlass: { color: palette.text },
});
