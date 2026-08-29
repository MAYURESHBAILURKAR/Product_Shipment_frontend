import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TextStyle, View } from "react-native";
import { palette, spacing } from "../../theme/tokens";
import { PressableScale } from "./PressableScale";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  titleStyle?: TextStyle;
}

// Standard screen header: back chevron (haptic) + title/subtitle + right slot.
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  titleStyle,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <PressableScale style={styles.back} onPress={onBack}>
          <Feather name="chevron-left" size={26} color={palette.text} />
        </PressableScale>
      ) : null}
      <View style={styles.titleWrap}>
        <Text style={[styles.title, titleStyle]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1 },
  title: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
