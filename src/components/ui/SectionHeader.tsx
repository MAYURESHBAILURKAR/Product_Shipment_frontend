import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, spacing } from "../../theme/tokens";
import { PressableScale } from "./PressableScale";

interface SectionHeaderProps {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Small uppercase section label with optional trailing action.
export function SectionHeader({ label, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} hapticFeedback>
          <Text style={styles.action}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  label: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  action: {
    color: palette.primaryBright,
    fontSize: 13,
    fontWeight: "600",
  },
});
