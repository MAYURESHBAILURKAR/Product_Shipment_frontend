import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { ComponentProps } from "react";
import { ColorValue, StyleSheet, Text, View } from "react-native";
import { palette, radius } from "../../theme/tokens";
import { PressableScale } from "./PressableScale";

type FeatherName = ComponentProps<typeof Feather>["name"];
type GradientPreset = "primary" | "success" | "accent" | "hero";
type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

interface GradientCardProps {
  preset: GradientPreset;
  icon?: FeatherName;
  label?: string;
  value?: string;
  onPress?: () => void;
  width?: number;
  height?: number;
  children?: React.ReactNode;
}

const gradients: Record<GradientPreset, GradientColors> = {
  primary: palette.gradient.primary,
  success: palette.gradient.success,
  accent: palette.gradient.accent,
  hero: palette.gradient.hero,
};

const iconColors: Record<GradientPreset, string> = {
  primary: "#FFFFFF",
  success: "#FFFFFF",
  accent: "#FFFFFF",
  hero: palette.primaryBright,
};

// Hero gradient card used for dashboard stats and action cards.
export function GradientCard({
  preset,
  icon,
  label,
  value,
  onPress,
  width,
  height = 140,
  children,
}: GradientCardProps) {
  const body = children ?? (
    <>
      {icon ? (
        <View style={styles.iconWrap}>
          <Feather name={icon} size={20} color={iconColors[preset]} />
        </View>
      ) : null}
      <View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {value ? (
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
        ) : null}
      </View>
    </>
  );

  const card = (
    <LinearGradient
      colors={gradients[preset]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { width, height }]}
    >
      {body}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={styles.pressWrap}>
        {card}
      </PressableScale>
    );
  }
  return card;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 20,
    justifyContent: "space-between",
  },
  pressWrap: { borderRadius: radius.lg, overflow: "hidden" },
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
  value: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: 2,
  },
});
