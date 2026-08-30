import { Feather } from "@expo/vector-icons";
import React from "react";
import { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, spacing } from "../../theme/tokens";
import { PressableScale } from "./PressableScale";
import { RupeeIcon } from "./RupeeIcon";
import { StaggerItem } from "./StaggerItem";

type FeatherName = ComponentProps<typeof Feather>["name"];

interface EmptyStateProps {
  icon: FeatherName;
  /** Render the MCI rupee glyph instead (Feather has no rupee icon) */
  rupee?: boolean;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Friendly empty-state block for lists and screens.
export function EmptyState({
  icon,
  rupee = false,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <StaggerItem>
      <View style={styles.wrap}>
        <View style={styles.iconWrap}>
          {rupee ? (
            <RupeeIcon size={28} color={palette.textTertiary} />
          ) : (
            <Feather name={icon} size={28} color={palette.textTertiary} />
          )}
        </View>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {actionLabel && onAction ? (
          <PressableScale style={styles.action} onPress={onAction}>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </PressableScale>
        ) : null}
      </View>
    </StaggerItem>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "600",
  },
  message: {
    color: palette.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  action: {
    marginTop: spacing.lg,
    backgroundColor: palette.primarySoft,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${palette.primary}33`,
  },
  actionLabel: {
    color: palette.primaryBright,
    fontWeight: "600",
    fontSize: 14,
  },
});
