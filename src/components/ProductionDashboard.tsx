import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
import {
  PressableScale,
  PrimaryButton,
  RupeeIcon,
  SectionHeader,
  StaggerItem,
  StatCard,
} from "./ui";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";
const SCREEN_WIDTH = Dimensions.get("window").width;

const ACTIONS = [
  { label: "New Ship", icon: "plus-circle", route: "/shipment-new", rupee: false },
  { label: "Inventory", icon: "package", route: "/(tabs)/products", rupee: false },
  { label: "Earnings", icon: "currency-rupee", route: "/my-earnings", rupee: true },
  { label: "History", icon: "list", route: "/shipment-tracker", rupee: false },
] as const;

const greetingForHour = (hour: number) => {
  if (hour < 12) return "GOOD MORNING,";
  if (hour < 17) return "GOOD AFTERNOON,";
  return "GOOD EVENING,";
};

export default function ProductionDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    stock: 0,
    earnings: 0,
    shipmentCount: 0,
  });
  const [loading, setLoading] = useState(false);

  // --- Fetch math preserved exactly ---
  const fetchStats = async () => {
    try {
      setLoading(true);
      const productsRes = await axios.get(`${API_URL}/products/myproducts`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const totalStock = productsRes.data.reduce(
        (acc: number, item: any) => acc + item.currentStock,
        0,
      );

      const shipmentsRes = await axios.get(`${API_URL}/shipments/myshipments`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const totalEarnings = shipmentsRes.data.reduce(
        (acc: number, item: any) => acc + item.totalAmount,
        0,
      );

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
                    {greetingForHour(new Date().getHours())}
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
                label="IN STOCK"
                value={stats.stock}
                preset="primary"
                index={1}
                width={SCREEN_WIDTH * 0.45}
              />
              <StatCard
                icon="trending-up"
                label="EARNINGS"
                value={stats.earnings}
                prefix="₹"
                preset="success"
                index={2}
                width={SCREEN_WIDTH * 0.45}
                onPress={() => router.push("/my-earnings")}
              />
            </ScrollView>
          </View>

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
                <Text style={styles.actionLabel}>{item.label}</Text>
              </PressableScale>
            ))}
          </StaggerItem>

          {/* 4. Shipment Summary */}
          <StaggerItem index={4}>
            <SectionHeader
              label="Recent Activity"
              actionLabel="View All"
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
                  <Text style={styles.summaryTitle}>Total Shipments</Text>
                  <Text style={styles.summarySub}>Historical volume</Text>
                </View>
                <Text style={styles.summaryValue}>{stats.shipmentCount}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, styles.summaryIconCyan]}>
                  <RupeeIcon size={17} color={palette.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>Payout Rate</Text>
                  <Text style={styles.summarySub}>Standard unit price</Text>
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
              <Text style={styles.ctaTitle}>Inventory Ready?</Text>
              <Text style={styles.ctaBody}>
                You currently have{" "}
                <Text style={styles.ctaHighlight}>{stats.stock} items</Text>{" "}
                processed. Create a shipment to move them to the warehouse and
                update your earnings.
              </Text>
              <PrimaryButton
                label="Start Shipment Process"
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
