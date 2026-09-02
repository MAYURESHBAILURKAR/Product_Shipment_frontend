import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar as RNCalendar, DateData } from "react-native-calendars";
import { palette, radius, spacing } from "../../theme/tokens";
import { useLanguage } from "../../i18n/LanguageProvider";
import type { TranslationKey } from "../../i18n/translations";
import { PressableScale, PrimaryButton } from "./index";

export interface DateRange {
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD" (inclusive)
}

interface DateRangeSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Currently applied range; null = no range filter active */
  initialRange?: DateRange | null;
  onApply: (range: DateRange | null) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const pretty = (key: string) => {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Date-range bottom sheet: pick From → To (inclusive) on a themed calendar,
// then Apply/Cancel/Clear. Nothing applies until Apply is pressed.
export function DateRangeSheet({
  visible,
  onClose,
  initialRange,
  onApply,
}: DateRangeSheetProps) {
  const { t } = useLanguage();
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);

  // Re-seed selection each open so canceling never mutates the applied filter.
  useEffect(() => {
    if (visible) {
      setStart(initialRange?.startDate ?? null);
      setEnd(initialRange?.endDate ?? null);
    }
  }, [visible, initialRange]);

  const today = toKey(new Date());

  const handleDayPress = (day: DateData) => {
    const key = day.dateString;
    if (!start || (start && end)) {
      // Start a new range
      setStart(key);
      setEnd(null);
    } else if (key < start) {
      // Picking before the current start: move start back
      setStart(key);
    } else {
      setEnd(key);
    }
  };

  const applyPreset = (days: number | null) => {
    if (days === null) {
      setStart(null);
      setEnd(null);
      return;
    }
    const now = new Date();
    const from = new Date(now.getTime() - days * DAY_MS);
    setStart(toKey(from));
    setEnd(today);
  };

  const marked = useMemo(() => {
    if (!start) return {};
    const marks: Record<string, any> = {
      [start]: {
        startingDay: true,
        color: palette.primary,
        textColor: "#FFFFFF",
      },
    };
    if (end) {
      marks[start] = { ...marks[start], endingDay: start === end };
      // Fill the in-between days
      const betweenCount = Math.round(
        (new Date(`${end}T00:00:00`).getTime() -
          new Date(`${start}T00:00:00`).getTime()) /
          DAY_MS,
      );
      for (let i = 1; i < betweenCount; i++) {
        const d = new Date(`${start}T00:00:00`);
        d.setDate(d.getDate() + i);
        const key = toKey(d);
        marks[key] = {
          color: palette.primarySoft,
          textColor: palette.primaryBright,
        };
      }
      marks[end] = {
        startingDay: start === end,
        endingDay: true,
        color: palette.primary,
        textColor: "#FFFFFF",
      };
    }
    return marks;
  }, [start, end]);

  const canApply = Boolean(start && end);

  const theme = {
    backgroundColor: "transparent",
    calendarBackground: "transparent",
    monthTextColor: palette.text,
    arrowColor: palette.primaryBright,
    textDayFontSize: 13,
    textMonthFontSize: 15,
    textDayHeaderFontSize: 11,
    textDayFontWeight: "500" as const,
    textMonthFontWeight: "700" as const,
    textDayHeaderFontWeight: "600" as const,
    dayTextColor: palette.textSecondary,
    todayTextColor: palette.primaryBright,
    selectedDayColor: palette.primary,
    selectedDayTextColor: "#FFFFFF",
    textDisabledColor: palette.textTertiary,
    textSectionTitleColor: palette.textTertiary,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <PressableScale
          hapticFeedback={false}
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        >
          <View style={styles.backdropDim} />
        </PressableScale>

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.notch} />
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Feather name="calendar" size={17} color={palette.primaryBright} />
              <Text style={styles.headerTitle}>{t("dateRange.title")}</Text>
            </View>
            <PressableScale hapticFeedback onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={16} color={palette.textSecondary} />
            </PressableScale>
          </View>

          {/* Range display */}
          <View style={styles.rangeRow}>
            <View
              style={[
                styles.rangeBox,
                start ? styles.rangeBoxActive : null,
              ]}
            >
              <Text style={styles.rangeLabel}>{t("dateRange.from")}</Text>
              <Text
                style={[styles.rangeValue, start ? styles.rangeValueActive : null]}
                numberOfLines={1}
              >
                {start ? pretty(start) : t("dateRange.selectDate")}
              </Text>
            </View>
            <Feather
              name="arrow-right"
              size={14}
              color={palette.textTertiary}
            />
            <View style={[styles.rangeBox, end ? styles.rangeBoxActive : null]}>
              <Text style={styles.rangeLabel}>{t("dateRange.to")}</Text>
              <Text
                style={[styles.rangeValue, end ? styles.rangeValueActive : null]}
                numberOfLines={1}
              >
                {end ? pretty(end) : t("dateRange.selectDate")}
              </Text>
            </View>
          </View>

          {/* Presets */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetRow}
          >
            {([
              { labelKey: "dateRange.today" as TranslationKey, days: 0 },
              { labelKey: "dateRange.last7" as TranslationKey, days: 6 },
              { labelKey: "dateRange.last30" as TranslationKey, days: 29 },
              { labelKey: "dateRange.last90" as TranslationKey, days: 89 },
            ]).map((p) => {
              const active =
                start !== null &&
                end !== null &&
                start === toKey(new Date(Date.now() - p.days * DAY_MS)) &&
                end === today;
              return (
                <PressableScale
                  key={p.labelKey}
                  hapticFeedback
                  onPress={() => applyPreset(p.days)}
                  style={[styles.presetChip, active && styles.presetChipActive]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      active && styles.presetChipTextActive,
                    ]}
                  >
                    {t(p.labelKey)}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          {/* Calendar */}
          <View style={styles.calendarWrap}>
            <RNCalendar
              onDayPress={handleDayPress}
              markedDates={marked}
              markingType="period"
              theme={theme}
              minDate={"2020-01-01"}
              maxDate={today}
              firstDay={1}
              hideExtraDays
              enableSwipeMonths
            />
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {initialRange ? (
              <PressableScale hapticFeedback onPress={() => onApply(null)} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>{t("dateRange.clear")}</Text>
              </PressableScale>
            ) : null}
            <View style={styles.applyWrap}>
              <PrimaryButton
                label={t("dateRange.applyFilter")}
                onPress={() => {
                  if (start && end) {
                    onApply({ startDate: start, endDate: end });
                  }
                }}
                disabled={!canApply}
                size="md"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropDim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.66)",
  },
  sheet: {
    backgroundColor: palette.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: palette.borderStrong,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  rangeBox: {
    flex: 1,
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  rangeBoxActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  rangeLabel: {
    color: palette.textTertiary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  rangeValue: {
    color: palette.textSecondary,
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 1,
  },
  rangeValueActive: { color: palette.text },
  presetRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 2,
    marginBottom: spacing.sm,
  },
  presetChip: {
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  presetChipActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  presetChipText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  presetChipTextActive: { color: palette.primaryBright },
  calendarWrap: {
    marginHorizontal: spacing.sm,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  clearBtn: {
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtnText: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  applyWrap: { flex: 1 },
});
