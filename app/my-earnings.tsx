import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EmptyState,
  ExportSheet,
  ExportFormat,
  OfflineBanner,
  PressableScale,
  ScreenHeader,
  SectionHeader,
  SkeletonListRow,
  StaggerItem,
  useToast,
} from "../src/components/ui";
import { palette, radius, spacing } from "../src/theme/tokens";
import { useAuth } from "../src/context/AuthContext";
import { useLanguage } from "../src/i18n/LanguageProvider";
import { getErrorMessage } from "../src/utils/errors";
import { cachedGet } from "../src/utils/apiCache";
import {
  buildEarningsHtml,
  copyText,
  earningsToCsv,
  EarningsMonthRow,
  sharePdf,
  shareTextToWhatsApp,
} from "../src/utils/shipmentExport";

// ⚠️ REPLACE IP
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const money = (n: number) => `₹ ${Math.round(n).toLocaleString("en-IN")}`;

export default function MyEarningsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Offline resilience: shows the banner when the list came from cache.
  const [staleSince, setStaleSince] = useState<number | null>(null);

  const fetchShipments = async () => {
    try {
      setRefreshing(true);
      const res = await cachedGet<any[]>(
        "shipments:mine",
        `${API_URL}/shipments/myshipments`,
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );
      setStaleSince(res.stale ? res.savedAt : null);
      setShipments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchShipments();
    }, []),
  );

  const rate = user?.priceAllotted || 0;

  // All figures derive from the client-side shipment list — no new API needed.
  const earnings = useMemo(() => {
    let pendingValue = 0;
    let pendingCount = 0;
    let receivedValue = 0;
    let receivedCount = 0;
    let paidValue = 0;
    const monthMap = new Map<string, EarningsMonthRow>();

    for (const s of shipments) {
      const amount = s.totalAmount ?? s.totalQuantity * rate;
      const d = new Date(s.shippedAt);
      const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

      let m = monthMap.get(key);
      if (!m) {
        m = { label, key, shipments: 0, units: 0, amount: 0 };
        monthMap.set(key, m);
      }
      m.shipments += 1;
      m.units += s.totalQuantity;
      m.amount += amount;

      if (s.status === "received") {
        receivedValue += amount;
        receivedCount += 1;
      } else {
        pendingValue += amount;
        pendingCount += 1;
      }
      if (s.paymentStatus === "paid") paidValue += amount;
    }

    const months = Array.from(monthMap.values()).sort((a, b) =>
      b.key.localeCompare(a.key),
    );

    return {
      pendingValue,
      pendingCount,
      receivedValue,
      receivedCount,
      paidValue,
      months,
      totalValue: pendingValue + receivedValue,
      totalUnits: months.reduce((a, m) => a + m.units, 0),
    };
  }, [shipments, rate]);

  const handleExport = async (format: ExportFormat) => {
    setExportOpen(false);
    if (earnings.months.length === 0) {
      showToast({ message: t("earnings.nothingToExport"), kind: "error" });
      return;
    }
    // Plain-text summary shared by "copy" and WhatsApp.
    const summaryText = () => {
      const total = money(earnings.totalValue);
      return [
        `My Earnings — ${user?.name}`,
        `Rate: ${money(rate)}/unit`,
        `Total: ${total} (${earnings.totalUnits} units)`,
        `Received: ${money(earnings.receivedValue)} · Pending: ${money(earnings.pendingValue)}`,
        "",
        ...earnings.months.map(
          (m) => `${m.label}: ${m.shipments} shipments, ${m.units} units, ${money(m.amount)}`,
        ),
      ].join("\n");
    };
    try {
      if (format === "pdf") {
        const ok = await sharePdf(
          buildEarningsHtml({
            months: earnings.months,
            ratePerUnit: rate,
            ownerName: user?.name,
          }),
          t("export.shareEarningsStatement"),
        );
        if (!ok) throw new Error("unavailable");
      } else if (format === "csv") {
        const ok = await copyText(earningsToCsv(earnings.months));
        showToast(
          ok
            ? { message: t("export.csvCopied"), kind: "success" }
            : { message: t("common.copyFailed"), kind: "error" },
        );
      } else if (format === "whatsapp") {
        const ok = await shareTextToWhatsApp(summaryText());
        showToast(
          ok
            ? { message: t("export.whatsappOpening"), kind: "success" }
            : { message: t("export.whatsappUnavailable"), kind: "error" },
        );
      } else {
        const ok = await copyText(summaryText());
        showToast(
          ok
            ? { message: t("export.summaryCopied"), kind: "success" }
            : { message: t("common.copyFailed"), kind: "error" },
        );
      }
    } catch (error) {
      showToast({ message: getErrorMessage(error, t, "export.failed"), kind: "error" });
    }
  };

  const HeaderStat = ({
    icon,
    label,
    value,
    tint,
  }: {
    icon: string;
    label: string;
    value: string;
    tint: string;
  }) => (
    <View style={[styles.statCard, { borderColor: `${tint}44`, backgroundColor: `${tint}12` }]}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}22` }]}>
        <Feather name={icon as any} size={16} color={tint} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ flex: 1 }}>
        <View style={styles.headerPad}>
          <ScreenHeader
            title={t("earnings.title")}
            subtitle={t("earnings.payoutHistory")}
            onBack={() => router.back()}
            right={
              <PressableScale hapticFeedback onPress={() => setExportOpen(true)} style={styles.calendarBtn}>
                <Feather name="share-2" size={16} color={palette.primaryBright} />
              </PressableScale>
            }
          />
        </View>

        {staleSince !== null && (
          <View style={styles.bannerWrap}>
            <OfflineBanner savedAt={staleSince} />
          </View>
        )}

        {loading ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonListRow key={i} />
            ))}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchShipments}
                tintColor={palette.primary}
                colors={[palette.primary]}
              />
            }
          >
            <View style={styles.wrap}>
              {/* Total earnings hero */}
              <StaggerItem index={0}>
                <View style={styles.hero}>
                  <Text style={styles.heroLabel}>{t("earnings.totalEarnings")}</Text>
                  <Text style={styles.heroValue}>{money(earnings.totalValue)}</Text>
                  <Text style={styles.heroSub}>
                    {earnings.totalUnits} {t("earnings.unitsSuffix")} · {money(rate)}/{t("earnings.unitsSuffix")}
                  </Text>
                </View>
              </StaggerItem>

              {/* Pending vs Received */}
              <StaggerItem index={1} style={styles.statRow}>
                <HeaderStat
                  icon="clock"
                  label={t("earnings.pending")}
                  value={money(earnings.pendingValue)}
                  tint={palette.warning}
                />
                <HeaderStat
                  icon="check-circle"
                  label={t("earnings.received")}
                  value={money(earnings.receivedValue)}
                  tint={palette.success}
                />
              </StaggerItem>

              {/* Paid progress */}
              <StaggerItem index={2}>
                <View style={styles.paidCard}>
                  <View style={styles.paidRow}>
                    <View>
                      <Text style={styles.paidTitle}>{t("earnings.payoutStatus")}</Text>
                      <Text style={styles.paidSub}>
                        {t("earnings.paidOf", {
                          paid: money(earnings.paidValue),
                          total: money(earnings.totalValue),
                        })}
                      </Text>
                    </View>
                    <Text style={styles.paidPct}>
                      {earnings.totalValue > 0
                        ? Math.round((earnings.paidValue / earnings.totalValue) * 100)
                        : 0}
                      %
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${
                            earnings.totalValue > 0
                              ? Math.min(
                                  100,
                                  (earnings.paidValue / earnings.totalValue) * 100,
                                )
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </StaggerItem>

              {/* Monthly breakdown */}
              <StaggerItem index={3}>
                <SectionHeader label={t("earnings.monthlyBreakdown")} />
                {earnings.months.length === 0 ? (
                  <EmptyState
                    icon="activity"
                    rupee
                    title={t("earnings.noEarnings")}
                    message={t("earnings.noEarningsMessage")}
                  />
                ) : (
                  <View style={styles.monthCol}>
                    {earnings.months.map((m) => {
                      const max = Math.max(...earnings.months.map((x) => x.amount), 1);
                      return (
                        <View key={m.key} style={styles.monthRow}>
                          <Text style={styles.monthLabel}>{m.label}</Text>
                          <View style={styles.monthBarTrack}>
                            <View
                              style={[
                                styles.monthBar,
                                { width: `${Math.max(4, (m.amount / max) * 100)}%` },
                              ]}
                            />
                          </View>
                          <View style={styles.monthRight}>
                            <Text style={styles.monthValue}>{money(m.amount)}</Text>
                            <Text style={styles.monthSub}>
                              {t("earnings.monthDetail", {
                                shipments: m.shipments,
                                units: m.units,
                              })}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </StaggerItem>
            </View>
          </ScrollView>
        )}
      </View>

      <ExportSheet
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        title={t("earnings.exportTitle")}
        subtitle={t("earnings.subtitle", {
          months: earnings.months.length,
          total: money(earnings.totalValue),
        })}
        onFormat={handleExport}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  skeletonWrap: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  bannerWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  wrap: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  calendarBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: 4,
  },
  heroLabel: {
    color: palette.textTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  heroValue: {
    color: palette.text,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -1,
  },
  heroSub: { color: palette.textSecondary, fontSize: 12, marginTop: 2 },
  statRow: { flexDirection: "row", gap: spacing.md },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    color: palette.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statValue: { fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },
  paidCard: {
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  paidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paidTitle: { color: palette.text, fontWeight: "700", fontSize: 14 },
  paidSub: { color: palette.textSecondary, fontSize: 12, marginTop: 2 },
  paidPct: {
    color: palette.accent,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  progressTrack: {
    height: 8,
    backgroundColor: palette.surfaceHighest,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: palette.success,
  },
  monthCol: { gap: spacing.sm },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  monthLabel: { color: palette.text, fontSize: 12.5, fontWeight: "700", width: 74 },
  monthBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: palette.surfaceHighest,
    borderRadius: 3,
    overflow: "hidden",
  },
  monthBar: { height: "100%", borderRadius: 3, backgroundColor: palette.primary },
  monthRight: { alignItems: "flex-end" },
  monthValue: { color: palette.text, fontSize: 12.5, fontWeight: "700" },
  monthSub: { color: palette.textTertiary, fontSize: 9.5, marginTop: 1 },
});
