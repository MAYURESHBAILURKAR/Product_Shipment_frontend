import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "tamagui";
import { useAuth } from "../context/AuthContext";
import { palette, radius, spacing } from "../theme/tokens";
import { useLanguage } from "../i18n/LanguageProvider";
import { cachedGet } from "../utils/apiCache";
import {
  OfflineBanner,
  PressableScale,
  PrimaryButton,
  RupeeIcon,
  SectionHeader,
  Sparkline,
  StaggerItem,
  StatCard,
} from "./ui";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";
const SCREEN_WIDTH = Dimensions.get("window").width;

const ACTIONS = [
  { label: "dash.newShip", icon: "plus-circle", route: "/shipment-new", rupee: false },
  { label: "dash.inventory", icon: "package", route: "/(tabs)/products", rupee: false },
  { label: "dash.earnings", icon: "currency-rupee", route: "/my-earnings", rupee: true },
  { label: "dash.history", icon: "list", route: "/shipment-tracker", rupee: false },
] as const;

export default function ProductionDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [stats, setStats] = useState({
    stock: 0,
    earnings: 0,
    shipmentCount: 0,
  });
  const [loading, setLoading] = useState(false);

  // Raw shipment list (same response as the stats fetch) — powers the
  // weekly trend card without an extra request.
  const [shipments, setShipments] = useState<any[]>([]);

  // Offline resilience: shows the banner when stats came from cache.
  const [staleSince, setStaleSince] = useState<number | null>(null);

  // --- Fetch math preserved exactly (axios → cachedGet swap only) ---
  const fetchStats = async () => {
    try {
      setLoading(true);
      const productsRes = await cachedGet<any[]>(
        "products:myproducts",
        `${API_URL}/products/myproducts`,
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );
      const totalStock = productsRes.data.reduce(
        (acc: number, item: any) => acc + item.currentStock,
        0,
      );

      const shipmentsRes = await cachedGet<any[]>(
        "shipments:mine",
        `${API_URL}/shipments/myshipments`,
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );
      const totalEarnings = shipmentsRes.data.reduce(
        (acc: number, item: any) => acc + item.totalAmount,
        0,
      );

      setStaleSince(productsRes.stale ? productsRes.savedAt : null);
      setShipments(shipmentsRes.data);
      setStats({
        stock: totalStock,
        earnings: totalEarnings,
        shipmentCount: shipmentsRes.data.length,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Last 7 days (oldest → newest) of units shipped — drives the sparkline.
  const weeklyUnits = useMemo(() => {
    const series = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const s of shipments) {
      const d = new Date(s.shippedAt);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.round(
        (today.getTime() - d.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (diffDays >= 0 && diffDays < 7) {
        series[6 - diffDays] += s.totalQuantity || 0;
      }
    }
    return series;
  }, [shipments]);

  const weeklyTotal = useMemo(
    () => weeklyUnits.reduce((a, b) => a + b, 0),
    [weeklyUnits],
  );

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, []),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchStats}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        <View style={styles.wrap}>
          {staleSince !== null && <OfflineBanner savedAt={staleSince} />}

          {/* 1. Header */}
          <StaggerItem index={0}>
            <View style={styles.headerRow}>
              <PressableScale
                onPress={() => router.push("/profile")}
                style={styles.headerLeft}
              >
                <Avatar circular size="$5">
                  <Avatar.Image
                    src={`https://ui-avatars.com/api/?name=${user?.name}&background=2F80ED&color=fff`}
                  />
                  <Avatar.Fallback backgroundColor={palette.primary} />
                </Avatar>
                <View>
                  <Text style={styles.greeting}>
                    {t(new Date().getHours() < 12
                      ? "dash.goodMorning"
                      : new Date().getHours() < 17
                        ? "dash.goodAfternoon"
                        : "dash.goodEvening")}
                  </Text>
                  <Text style={styles.name}>{user?.name?.split(" ")[0]}</Text>
                </View>
              </PressableScale>

              <PressableScale onPress={() => router.push("/(tabs)/profile")}>
                <View style={styles.bellWrap}>
                  <Feather name="bell" size={19} color={palette.text} />
                </View>
              </PressableScale>
            </View>
          </StaggerItem>

          {/* 2. Stat Cards */}
          <View style={{ marginBottom: spacing.lg }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              <StatCard
                icon="box"
                label={t("dash.inStock")}
                value={stats.stock}
                preset="primary"
                index={1}
                width={SCREEN_WIDTH * 0.45}
              />
              <StatCard
                icon="trending-up"
                label={t("dash.earnings")}
                value={stats.earnings}
                prefix="₹"
                preset="success"
                index={2}
                width={SCREEN_WIDTH * 0.45}
                onPress={() => router.push("/my-earnings")}
              />
            </ScrollView>
          </View>

          {/* 2.5 Weekly Trend Sparkline */}
          <StaggerItem index={2}>
            <View style={styles.trendCard}>
              <View style={styles.trendHeader}>
                <View style={styles.trendIconWrap}>
                  <Feather name="activity" size={16} color={palette.primaryBright} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trendTitle}>{t("dash.thisWeek")}</Text>
                  <Text style={styles.trendSub}>{t("dash.thisWeekSub")}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.trendValue}>{weeklyTotal}</Text>
                  <Text style={styles.trendValueLabel}>{t("dash.units")}</Text>
                </View>
              </View>
              <Sparkline
                data={weeklyUnits}
                width={SCREEN_WIDTH - spacing.xl * 2 - spacing.lg * 2}
                height={56}
              />
            </View>
          </StaggerItem>

          {/* 3. Action Grid */}
          <StaggerItem index={3} style={styles.actionGrid}>
            {ACTIONS.map((item) => (
              <PressableScale
                key={item.label}
                style={styles.actionTile}
                onPress={() => router.push(item.route as any)}
              >
                {item.rupee ? (
                  <RupeeIcon size={21} color={palette.primaryBright} />
                ) : (
                  <Feather
                    name={item.icon as any}
                    size={21}
                    color={palette.primaryBright}
                  />
                )}
                <Text style={styles.actionLabel}>{t(item.label as any)}</Text>
              </PressableScale>
            ))}
          </StaggerItem>

          {/* 4. Shipment Summary */}
          <StaggerItem index={4}>
            <SectionHeader
              label={t("dash.recentActivity")}
              actionLabel={t("dash.viewAll")}
              onAction={() => router.push("/shipment-tracker")}
            />
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, styles.summaryIconBlue]}>
                  <Feather
                    name="truck"
                    size={17}
                    color={palette.primaryBright}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>{t("dash.totalShipments")}</Text>
                  <Text style={styles.summarySub}>{t("dash.historicalVolume")}</Text>
                </View>
                <Text style={styles.summaryValue}>{stats.shipmentCount}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, styles.summaryIconCyan]}>
                  <RupeeIcon size={17} color={palette.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>{t("dash.payoutRate")}</Text>
                  <Text style={styles.summarySub}>{t("dash.standardUnitPrice")}</Text>
                </View>
                <Text style={[styles.summaryValue, { color: palette.accent }]}>
                  ₹ {user?.priceAllotted}
                </Text>
              </View>
            </View>
          </StaggerItem>

          {/* 5. Production CTA Banner */}
          <StaggerItem index={5}>
            <View style={styles.ctaCard}>
              <Text style={styles.ctaTitle}>{t("dash.ctaTitle")}</Text>
              <Text style={styles.ctaBody}>
                {t("dash.ctaBodyA")}
                <Text style={styles.ctaHighlight}>
                  {stats.stock} {t("dash.ctaBodyItems")}
                </Text>
                {t("dash.ctaBodyB")}
              </Text>
              <PrimaryButton
                label={t("dash.ctaButton")}
                icon="arrow-right"
                size="lg"
                onPress={() => router.push("/shipment-new")}
              />
            </View>
          </StaggerItem>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.xl },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  greeting: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  name: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  bellWrap: {
    backgroundColor: palette.surfaceElevated,
    padding: spacing.sm,
    borderRadius: radius.pill,
    borderColor: palette.border,
    borderWidth: 1,
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  trendCard: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  trendIconWrap: {
    backgroundColor: palette.primarySoft,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  trendTitle: { color: palette.text, fontWeight: "700", fontSize: 14 },
  trendSub: { color: palette.textSecondary, fontSize: 11.5, marginTop: 1 },
  trendValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  trendValueLabel: {
    color: palette.textTertiary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 1,
  },
  actionTile: {
    flex: 1,
    backgroundColor: palette.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderColor: palette.border,
    borderWidth: 1,
    alignItems: "center",
    gap: spacing.sm,
  },
  actionLabel: {
    color: palette.text,
    fontSize: 10,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  summaryIcon: {
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  summaryIconBlue: { backgroundColor: palette.primarySoft },
  summaryIconCyan: { backgroundColor: "rgba(76, 201, 240, 0.12)" },
  summaryTitle: { color: palette.text, fontWeight: "600", fontSize: 14 },
  summarySub: { color: palette.textSecondary, fontSize: 12, marginTop: 2 },
  summaryValue: { color: palette.text, fontSize: 17, fontWeight: "700" },
  summaryDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  ctaCard: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.primary,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  ctaTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  ctaBody: {
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  ctaHighlight: { color: palette.text, fontWeight: "700" },
});
