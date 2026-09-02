import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { palette, radius, spacing } from "../../theme/tokens";
import { useLanguage } from "../../i18n/LanguageProvider";

// "YYYY-MM-DD" from a Date — same format react-native-calendars uses.
const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const pretty = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

interface ShipmentCalendarProps {
  /** Already-filtered shipment list (respects the screen's filters). */
  shipments: any[];
  /** "YYYY-MM-DD" of the tapped day; null = no day narrowed. */
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
}

// Intensity bucket per day based on shipment count.
const bucketColor = (count: number) => {
  if (count <= 0) return "transparent";
  if (count === 1) return `${palette.primary}33`;
  if (count <= 3) return `${palette.primary}66`;
  return `${palette.primary}CC`;
};

// Month heatmap of shipment density. Tapping a day narrows the list below;
// tapping it again (or the same day) clears the selection.
export function ShipmentCalendar({
  shipments,
  selectedDay,
  onSelectDay,
}: ShipmentCalendarProps) {
  const { t } = useLanguage();
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of shipments) {
      const key = toKey(new Date(s.shippedAt));
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [shipments]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const [key, count] of counts) {
      if (count <= 0) continue;
      marks[key] = {
        customStyles: {
          container: {
            borderRadius: 6,
            backgroundColor: bucketColor(count),
          },
          text: {
            color: count >= 4 ? "#FFFFFF" : palette.textSecondary,
            fontWeight: count >= 4 ? "700" : "500",
          },
        },
      };
    }
    if (selectedDay) {
      marks[selectedDay] = {
        ...(marks[selectedDay] || {}),
        customStyles: {
          container: {
            borderRadius: 6,
            backgroundColor:
              counts.get(selectedDay) || 0 > 0
                ? bucketColor(counts.get(selectedDay) || 0)
                : `${palette.primary}12`,
            borderColor: palette.primaryBright,
            borderWidth: 1.5,
          },
          text: {
            color: palette.text,
            fontWeight: "700",
          },
        },
      };
    }
    return marks;
  }, [counts, selectedDay]);

  const handleDayPress = (day: DateData) => {
    onSelectDay(selectedDay === day.dateString ? null : day.dateString);
  };

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
    textDisabledColor: palette.textTertiary,
    textSectionTitleColor: palette.textTertiary,
  };

  return (
    <View style={styles.wrap}>
      <Calendar
        markingType="custom"
        markedDates={markedDates}
        onDayPress={handleDayPress}
        theme={theme}
        hideExtraDays
        firstDay={1}
      />
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>{t("calendar.less")}</Text>
        {["transparent", `${palette.primary}33`, `${palette.primary}66`, `${palette.primary}CC`].map(
          (c, i) => (
            <View
              key={i}
              style={[
                styles.legendSwatch,
                i === 0 && styles.legendSwatchEmpty,
                { backgroundColor: c },
              ]}
            />
          ),
        )}
        <Text style={styles.legendLabel}>{t("calendar.more")}</Text>
      </View>
      {selectedDay ? (
        <View style={styles.selectedBanner}>
          <Text style={styles.selectedText}>
            {t("tracker.showingDay", { day: pretty(selectedDay) })}
          </Text>
          <Text style={styles.selectedCount}>
            {t("tracker.shipmentCount", { count: counts.get(selectedDay) || 0 })}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>{t("tracker.calendarHint")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  legendLabel: {
    color: palette.textTertiary,
    fontSize: 10,
    marginHorizontal: 4,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendSwatchEmpty: {
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
  },
  selectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.primarySoft,
    borderColor: `${palette.primary}55`,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedText: {
    color: palette.text,
    fontSize: 12.5,
    fontWeight: "600",
  },
  selectedCount: {
    color: palette.primaryBright,
    fontSize: 12,
    fontWeight: "700",
  },
  hint: {
    color: palette.textTertiary,
    fontSize: 11,
    textAlign: "center",
  },
});
