import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { palette, radius, spacing } from "../../theme/tokens";
import { useLanguage } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { PressableScale } from "./index";

export type ExportFormat = "pdf" | "csv" | "copy" | "whatsapp";

interface ExportSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onFormat: (format: ExportFormat) => void;
  disabled?: boolean;
}

const OPTIONS: {
  format: ExportFormat;
  icon: string;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
}[] = [
  { format: "pdf", icon: "file-text", labelKey: "export.pdf", hintKey: "export.pdfHint" },
  { format: "csv", icon: "grid", labelKey: "export.csv", hintKey: "export.csvHint" },
  { format: "copy", icon: "copy", labelKey: "export.copy", hintKey: "export.copyHint" },
  { format: "whatsapp", icon: "message-circle", labelKey: "export.whatsapp", hintKey: "export.whatsappHint" },
];

// Bottom sheet for export options: PDF / CSV / copy. The parent supplies
// the generated content via onFormat; nothing is produced here.
export function ExportSheet({
  visible,
  onClose,
  title,
  subtitle,
  onFormat,
  disabled = false,
}: ExportSheetProps) {
  const { t } = useLanguage();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <PressableScale
          hapticFeedback={false}
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        >
          <View style={styles.backdropDim} />
        </PressableScale>

        <View style={styles.sheet}>
          <View style={styles.notch} />
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Feather name="share" size={16} color={palette.primaryBright} />
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <PressableScale hapticFeedback onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={15} color={palette.textSecondary} />
            </PressableScale>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <View style={styles.optionsCol}>
            {OPTIONS.map((opt) => (
              <PressableScale
                key={opt.format}
                hapticFeedback
                disabled={disabled}
                onPress={() => onFormat(opt.format)}
                style={[styles.optionRow, disabled && styles.optionDisabled]}
              >
                <View style={styles.optionIcon}>
                  <Feather name={opt.icon as any} size={18} color={palette.primaryBright} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{t(opt.labelKey)}</Text>
                  <Text style={styles.optionHint}>{t(opt.hintKey)}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={palette.textTertiary} />
              </PressableScale>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  backdropDim: { flex: 1, backgroundColor: "rgba(0,0,0,0.66)" },
  sheet: {
    backgroundColor: palette.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: palette.borderStrong,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  notch: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.borderStrong,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    color: palette.textSecondary,
    fontSize: 12,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  optionsCol: { gap: spacing.xs, paddingHorizontal: spacing.lg },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optionDisabled: { opacity: 0.5 },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { color: palette.text, fontSize: 14, fontWeight: "700" },
  optionHint: { color: palette.textSecondary, fontSize: 11.5, marginTop: 1 },
});
