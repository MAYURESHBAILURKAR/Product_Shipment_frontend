import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { describeAge } from "../../utils/apiCache";
import { palette, radius, spacing } from "../../theme/tokens";
import { useLanguage } from "../../i18n/LanguageProvider";

interface OfflineBannerProps {
  /** When the cached copy was saved; renders "saved Xm/h/d ago". */
  savedAt: number | null;
}

// Amber strip shown under a screen header when its data came from the
// offline cache instead of the server.
export function OfflineBanner({ savedAt }: OfflineBannerProps) {
  const { t } = useLanguage();
  return (
    <View style={styles.banner}>
      <Feather name="wifi-off" size={14} color={palette.warning} />
      <Text style={styles.text}>
        {t("common.offline")}
        {savedAt ? ` (${describeAge(savedAt)})` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${palette.warning}14`,
    borderColor: `${palette.warning}44`,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  text: {
    color: palette.warning,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
});
