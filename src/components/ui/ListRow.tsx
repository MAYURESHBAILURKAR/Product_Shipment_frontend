import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, radius, spacing } from "../../theme/tokens";
import { PressableScale } from "./PressableScale";
import { StaggerItem } from "./StaggerItem";

interface ListRowProps {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Right-side content: badge, amount, or chevron is added automatically if absent */
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  index?: number;
  dimmed?: boolean;
}

// Standard list row with staggered entrance, press feedback, and haptic.
// Used for users, shipments, products, and profile menu items.
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  showChevron = true,
  onPress,
  index = 0,
  dimmed = false,
}: ListRowProps) {
  const content = (
    <View style={styles.row}>
      {leading}
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron && !trailing ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </View>
  );

  const inner = onPress ? (
    <PressableScale style={styles.pressable} onPress={onPress}>
      {content}
    </PressableScale>
  ) : (
    <View style={styles.staticRow}>{content}</View>
  );

  return (
    <StaggerItem index={index} travelY={12}>
      <View style={[styles.card, dimmed && styles.dimmed]}>{inner}</View>
    </StaggerItem>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  dimmed: { opacity: 0.55 },
  pressable: {},
  staticRow: { padding: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  textWrap: { flex: 1 },
  title: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  chevron: {
    color: palette.textTertiary,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "300",
    marginLeft: spacing.xs,
  },
});
