import React from "react";
import { StyleSheet, Text } from "react-native";
import { palette, statusColorFor } from "../../theme/tokens";

interface StatusBadgeProps {
  status: string;
  label?: string;
}

// Soft pill badge for shipment/user status with token-derived colors.
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const color = statusColorFor(status);
  return (
    <Text style={[styles.badge, { color, backgroundColor: `${color}1F`, borderColor: `${color}33` }]}>
      {label ?? status}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
});
