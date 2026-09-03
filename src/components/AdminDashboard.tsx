import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { ComponentProps, memo, useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  ScrollView,
  Sheet,
  Text as TText,
  YStack,
} from "tamagui";
import {
  EmptyState,
  FastInput,
  GradientCard,
  ListRow,
  OfflineBanner,
  PressableScale,
  PrimaryButton,
  RupeeIcon,
  SectionHeader,
  SkeletonListRow,
  Sparkline,
  StaggerItem,
  StatCard,
  useDismissOnBack,
  useToast,
} from "./ui";
import { palette, radius, shadow, spacing } from "../theme/tokens";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageProvider";
import { getErrorMessage } from "../utils/errors";
import { cachedGet } from "../utils/apiCache";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";
const SCREEN_WIDTH = Dimensions.get("window").width;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function AttentionChip({
  icon,
  rupee = false,
  count,
  label,
  tint,
  onPress,
}: {
  icon: ComponentProps<typeof Feather>["name"];
  rupee?: boolean;
  count: number;
  label: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      hapticFeedback
      onPress={onPress}
      style={[
        styles.attentionChip,
        { borderColor: `${tint}44`, backgroundColor: `${tint}12` },
      ]}
    >
      <View style={styles.attentionTop}>
        {rupee ? (
          <RupeeIcon size={13} color={tint} />
        ) : (
          <Feather name={icon} size={13} color={tint} />
        )}
        <Text style={[styles.attentionCount, { color: tint }]}>{count}</Text>
      </View>
      <Text style={styles.attentionLabel}>{label}</Text>
    </PressableScale>
  );
}

// Trend chart block, memoized: skips re-render when only the search text
// changes (its inputs are chartMode / displayData / totals).
type TFunc = (key: any, params?: Record<string, string | number>) => string;
const MemoChartCard = memo(function ChartCard({
  chartMode,
  displayData,
  totalWeekly,
  totalMonthly,
  onModeChange,
  t,
}: {
  chartMode: "W" | "M";
  displayData: { labels: string[]; datasets: { data: number[] }[] };
  totalWeekly: number;
  totalMonthly: number;
  onModeChange: (m: "W" | "M") => void;
  t: TFunc;
}) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{t("admin.productionTrend")}</Text>
        <View style={styles.pillRow}>
          {(["W", "M"] as const).map((label) => (
            <PressableScale
              key={label}
              hapticFeedback
              onPress={() => onModeChange(label)}
              style={[
                styles.pill,
                chartMode === label && styles.pillActive,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  chartMode === label && styles.pillTextActive,
                ]}
              >
                {label}
              </Text>
            </PressableScale>
          ))}
        </View>
      </View>
      {/* Slim trend strip mirroring the active mode's series */}
      <View style={styles.sparkStrip}>
        <Sparkline
          data={displayData.datasets[0].data}
          width={SCREEN_WIDTH - 64 - spacing.lg * 2}
          height={40}
        />
      </View>
      <LineChart
        data={displayData}
        width={SCREEN_WIDTH - 64}
        height={180}
        chartConfig={{
          backgroundColor: "transparent",
          backgroundGradientFrom: palette.surfaceElevated,
          backgroundGradientTo: palette.surfaceElevated,
          decimalPlaces: 0,
          fillShadowGradient: `${palette.primaryBright}55`,
          fillShadowGradientOpacity: 1,
          color: (opacity = 1) => `rgba(90, 164, 245, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(139, 148, 167, ${opacity})`,
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: palette.primaryBright,
          },
          propsForBackgroundLines: {
            stroke: palette.border,
          },
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 16 }}
      />
      <Text style={styles.chartFootnote}>
        {chartMode === "W"
          ? t("admin.unitsThisWeek", { count: totalWeekly.toLocaleString() })
          : t("admin.unitsSixMonths", { count: totalMonthly.toLocaleString() })}
      </Text>
    </View>
  );
});

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useLanguage();

  // Data State
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Search & Filter State — raw text in a ref, debounced into state so a
  // keystroke burst coalesces into one list refilter instead of one per key.
  const [searchQuery, setSearchQuery] = useState("");
  const searchQueryRef = useRef("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setSearchQueryDebounced = useCallback((text: string) => {
    searchQueryRef.current = text;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearchQuery(text), 150);
  }, []);
  const [filterTab, setFilterTab] = useState("All"); // All, Active, Inactive

  // Form State — text lives in refs (FastInput pattern): typing never
  // re-renders this screen (chart/lists stay idle). Seeding on open/close
  // flows through FastInput's `value` sync.
  const form = useRef({ name: "", email: "", password: "", mobile: "", locality: "", price: "" });
  const [formSeed, setFormSeed] = useState({
    name: "", email: "", password: "", mobile: "", locality: "", price: "",
  });
  const [isActive, setIsActive] = useState(true);

  // Bumped on every sheet open: remounts the form inputs so half-typed
  // text from a previous open never leaks into the next one (the Sheet
  // stays mounted when closed, so FastInput's internal text would
  // otherwise survive a reopen that re-seeds the same values).
  const [sheetSession, setSheetSession] = useState(0);

  const [chartData, setChartData] = useState({
    labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
  });

  // Admin-wide shipment list: powers the Month chart mode and the
  // Needs Attention counters.
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [chartMode, setChartMode] = useState<"W" | "M">("W");

  // Offline resilience: shows the banner when lists came from cache.
  const [staleSince, setStaleSince] = useState<number | null>(null);

  useDismissOnBack(openSheet, () => setOpenSheet(false));

  // --- Fetch logic preserved exactly (axios → cachedGet swap only) ---
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await cachedGet<any[]>("users", `${API_URL}/users`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartStats = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/shipments/stats/weekly`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      // Map the 1-7 (Sun-Sat) response to the array
      const quantities = [0, 0, 0, 0, 0, 0, 0];
      data.forEach((stat: any) => {
        quantities[stat._id - 1] = stat.totalQuantity;
      });

      setChartData({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [{ data: quantities }],
      });
    } catch (error) {
      console.error("Chart fetch error:", error);
    }
  };

  const fetchAllShipments = async () => {
    try {
      const res = await cachedGet<any[]>(
        "shipments:all",
        `${API_URL}/shipments`,
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );
      setAllShipments(res.data);
      setStaleSince(res.stale ? res.savedAt : null);
    } catch (error) {
      console.error("Shipment fetch error:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
      fetchChartStats();
      fetchAllShipments();
    }, []),
  );

  // --- Filter logic preserved exactly ---
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.locality?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterTab === "All"
          ? true
          : filterTab === "Active"
            ? u.isActive
            : !u.isActive;

      return matchesSearch && matchesFilter;
    });
  }, [users, searchQuery, filterTab]);

  // --- Form handlers preserved exactly (state → ref reads only) ---
  const openAddMode = () => {
    setEditingUser(null);
    form.current = { name: "", email: "", password: "", mobile: "", locality: "", price: "" };
    setFormSeed({ name: "", email: "", password: "", mobile: "", locality: "", price: "" });
    setSheetSession((c) => c + 1);
    setIsActive(true);
    setOpenSheet(true);
  };

  const openEditMode = (item: any) => {
    setEditingUser(item);
    const seed = {
      name: item.name || "",
      email: item.email || "",
      mobile: item.mobile || "",
      locality: item.locality || "",
      price: item.priceAllotted?.toString() || "",
      password: "",
    };
    form.current = { ...seed };
    setFormSeed(seed);
    setSheetSession((c) => c + 1);
    setIsActive(item.isActive !== false);
    setOpenSheet(true);
  };

  const handleSaveUser = async () => {
    const { name, email, password, mobile, locality, price } = form.current;
    if (!name || !email || !price) {
      showToast({
        message: t("admin.requiredFields"),
        kind: "error",
      });
      return;
    }
    setUploading(true);
    try {
      const payload: any = {
        name,
        email,
        mobile,
        locality,
        priceAllotted: Number(price),
        isActive,
      };
      if (password) payload.password = password;

      if (editingUser) {
        await axios.put(`${API_URL}/users/${editingUser._id}`, payload, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        showToast({ message: t("admin.userUpdated"), kind: "success" });
      } else {
        if (!password) {
          showToast({ message: t("admin.passwordRequired"), kind: "error" });
          setUploading(false);
          return;
        }
        await axios.post(`${API_URL}/users`, payload, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        showToast({ message: t("admin.userCreated"), kind: "success" });
      }
      setOpenSheet(false);
      fetchUsers();
    } catch (error: any) {
      showToast({
        message: getErrorMessage(error, t, "admin.operationFailed"),
        kind: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const totalWeekly = useMemo(
    () => chartData.datasets[0].data.reduce((a: number, b: number) => a + b, 0),
    [chartData],
  );

  // Last 6 calendar months (oldest → newest) from allShipments.
  const monthlySeries = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; total: number }[] = [];
    for (let back = 5; back >= 0; back--) {
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: MONTHS[d.getMonth()],
        total: 0,
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const s of allShipments) {
      const d = new Date(s.shippedAt);
      const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (b) b.total += s.totalQuantity || 0;
    }
    return buckets;
  }, [allShipments]);

  const totalMonthly = useMemo(
    () => monthlySeries.reduce((a, b) => a + b.total, 0),
    [monthlySeries],
  );

  const displayData = useMemo(
    () =>
      chartMode === "W"
        ? chartData
        : {
            labels: monthlySeries.map((m) => m.label),
            datasets: [{ data: monthlySeries.map((m) => m.total) }],
          },
    [chartMode, chartData, monthlySeries],
  );

  // Needs Attention counters, derived from already-fetched data.
  const attention = useMemo(() => {
    const pendingShipments = allShipments.filter(
      (s: any) => s.status === "pending",
    ).length;
    const unpaidPayouts = allShipments.filter(
      (s: any) => s.paymentStatus !== "paid",
    ).length;
    const inactiveUsers = users.filter((u: any) => !u.isActive).length;
    return { pendingShipments, unpaidPayouts, inactiveUsers };
  }, [allShipments, users]);

  const renderUser = ({ item, index }: any) => (
    <ListRow
      index={index}
      dimmed={!item.isActive}
      onPress={() => openEditMode(item)}
      leading={
        <View>
          <Avatar circular size="$5">
            <Avatar.Image
              src={`https://ui-avatars.com/api/?name=${item.name}&background=random`}
            />
            <Avatar.Fallback backgroundColor="$gray8" />
          </Avatar>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.isActive ? palette.success : palette.textTertiary },
            ]}
          />
        </View>
      }
      title={item.name}
      subtitle={`${item.locality || t("admin.noLocality")} • ₹${item.priceAllotted}/unit`}
      trailing={
        <View style={styles.editIcon}>
          <Feather name="edit-2" size={16} color={palette.primaryBright} />
        </View>
      }
      showChevron={false}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={styles.flex}>
        {loading && users.length === 0 ? (
          <View style={styles.skeletonWrap}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </View>
        ) : (
          <FlatList
            ListHeaderComponent={
              <View style={styles.headerWrap}>
                {staleSince !== null && <OfflineBanner savedAt={staleSince} />}

                {/* 1. Header with Avatar */}
                <StaggerItem index={0}>
                  <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dateLabel}>
                        {new Date().toDateString()}
                      </Text>
                      <Text style={styles.heading}>{t("admin.dashboard")}</Text>
                    </View>
                    <PressableScale onPress={() => router.push("/profile")}>
                      <Avatar circular size="$5">
                        <Avatar.Image
                          src={`https://ui-avatars.com/api/?name=${user?.name || "Admin"}&background=2F80ED&color=fff&size=128`}
                        />
                        <Avatar.Fallback backgroundColor="$blue10" />
                      </Avatar>
                    </PressableScale>
                  </View>
                </StaggerItem>

                {/* 2. Overview / Action Cards */}
                <StaggerItem index={1} style={{ marginBottom: spacing.lg }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                  >
                    <StatCard
                      icon="users"
                      label={t("admin.totalUsers")}
                      value={users.length}
                      preset="primary"
                      index={0}
                    />
                    <GradientCard
                      preset="accent"
                      icon="truck"
                      label={t("admin.shipments")}
                      value={t("admin.manage")}
                      onPress={() => router.push("/admin-shipments")}
                    />
                    <GradientCard
                      preset="success"
                      icon="bar-chart-2"
                      label={t("admin.analytics")}
                      value={t("admin.reports")}
                      onPress={() => router.push("/admin-reports")}
                    />
                    <GradientCard
                      preset="hero"
                      icon="file-text"
                      label={t("admin.logs")}
                      value={t("dash.history")}
                      onPress={() => router.push("/shipment-tracker")}
                    />
                  </ScrollView>
                </StaggerItem>

                {/* 2.5 Needs Attention strip */}
                <StaggerItem index={2} style={{ marginBottom: spacing.lg }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                  >
                    <AttentionChip
                      icon="clock"
                      count={attention.pendingShipments}
                      label={t("admin.pendingShipments")}
                      tint={palette.warning}
                      onPress={() => router.push("/shipment-tracker")}
                    />
                    <AttentionChip
                      icon="activity"
                      rupee
                      count={attention.unpaidPayouts}
                      label={t("admin.unpaidPayouts")}
                      tint={palette.accent}
                      onPress={() => router.push("/shipment-tracker")}
                    />
                    <AttentionChip
                      icon="user-x"
                      count={attention.inactiveUsers}
                      label={t("admin.inactiveUsers")}
                      tint={palette.danger}
                      onPress={() => setFilterTab("Inactive")}
                    />
                  </ScrollView>
                </StaggerItem>

                {/* 3. Production Trend Chart */}
                <StaggerItem index={3}>
                  <MemoChartCard
                    chartMode={chartMode}
                    displayData={displayData}
                    totalWeekly={totalWeekly}
                    totalMonthly={totalMonthly}
                    onModeChange={setChartMode}
                    t={t}
                  />
                </StaggerItem>

                {/* 4. User Management */}
                <StaggerItem index={4} style={styles.userSection}>
                  <SectionHeader label={t("admin.productionUsers")} />

                  {/* Search Bar */}
                  <View style={styles.searchWrap}>
                    <Feather name="search" size={18} color={palette.textTertiary} />
                    <FastInput
                      flex={1}
                      backgroundColor="transparent"
                      borderWidth={0}
                      placeholder={t("admin.searchUsers")}
                      placeholderTextColor="$gray10"
                      color={palette.text}
                      value={searchQuery}
                      onChangeText={setSearchQueryDebounced}
                    />
                  </View>

                  {/* Filter Tabs */}
                  <View style={styles.filterRow}>
                    {(["All", "Active", "Inactive"] as const).map((tab) => (
                      <PressableScale
                        key={tab}
                        hapticFeedback
                        onPress={() => setFilterTab(tab)}
                        style={[
                          styles.filterTab,
                          filterTab === tab && styles.filterTabActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterText,
                            filterTab === tab && styles.filterTextActive,
                          ]}
                        >
                          {tab === "All"
                            ? t("admin.filterAll")
                            : tab === "Active"
                              ? t("admin.filterActive")
                              : t("admin.filterInactive")}
                        </Text>
                      </PressableScale>
                    ))}
                  </View>
                </StaggerItem>
              </View>
            }
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  icon="users"
                  title={t("admin.noUsers")}
                  message={
                    searchQuery
                      ? t("admin.noUsersSearch")
                      : t("admin.addFirstUser")
                  }
                  actionLabel={t("admin.addUser")}
                  onAction={openAddMode}
                />
              ) : null
            }
            data={filteredUsers}
            keyExtractor={(item: any) => item._id}
            renderItem={renderUser}
            contentContainerStyle={{ paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB */}
        <PressableScale
          onPress={openAddMode}
          hapticFeedback
          style={styles.fab}
        >
          <Feather name="plus" size={28} color="#FFFFFF" />
        </PressableScale>

        {/* ADD / EDIT USER SHEET */}
        <Sheet
          modal
          open={openSheet}
          onOpenChange={setOpenSheet}
          snapPoints={[85]}
          dismissOnSnapToBottom
        >
          <Sheet.Overlay />
          <Sheet.Frame padding="$4" gap="$3" backgroundColor={palette.surfaceElevated}>
            <Sheet.Handle />
            <TText color={palette.text} fontSize={20} fontWeight="700" textAlign="center" marginBottom="$4">
              {editingUser ? t("admin.editProfile") : t("admin.newUser")}
            </TText>

            <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
              <FastInput
                key={`name-${sheetSession}`}
                placeholder={t("admin.fullName")}
                value={formSeed.name}
                onChangeText={(text) => (form.current.name = text)}
                backgroundColor={palette.surfaceHighest}
                color={palette.text}
                borderColor={palette.border}
                placeholderTextColor="$gray10"
                size="$4"
              />
              <FastInput
                key={`email-${sheetSession}`}
                placeholder={t("admin.email")}
                value={formSeed.email}
                onChangeText={(text) => (form.current.email = text)}
                keyboardType="email-address"
                autoCapitalize="none"
                backgroundColor={palette.surfaceHighest}
                color={palette.text}
                borderColor={palette.border}
                placeholderTextColor="$gray10"
                size="$4"
              />
              <FastInput
                key={`mobile-${sheetSession}`}
                placeholder={t("admin.mobileNumber")}
                value={formSeed.mobile}
                onChangeText={(text) => (form.current.mobile = text)}
                keyboardType="phone-pad"
                backgroundColor={palette.surfaceHighest}
                color={palette.text}
                borderColor={palette.border}
                placeholderTextColor="$gray10"
                size="$4"
              />
              <FastInput
                key={`locality-${sheetSession}`}
                placeholder={t("admin.locality")}
                value={formSeed.locality}
                onChangeText={(text) => (form.current.locality = text)}
                backgroundColor={palette.surfaceHighest}
                color={palette.text}
                borderColor={palette.border}
                placeholderTextColor="$gray10"
                size="$4"
              />

              <YStack>
                <TText color={palette.textSecondary} fontSize={12} marginBottom="$1">
                  {t("admin.priceRate")}
                </TText>
                <FastInput
                  key={`price-${sheetSession}`}
                  placeholder="1.50"
                  value={formSeed.price}
                  onChangeText={(text) => (form.current.price = text)}
                  keyboardType="numeric"
                  backgroundColor={palette.surfaceHighest}
                  color={palette.text}
                  borderColor={palette.border}
                  placeholderTextColor="$gray10"
                  size="$4"
                />
              </YStack>

              <FastInput
                key={`password-${sheetSession}`}
                placeholder={
                  editingUser ? t("profile.newPassword") : t("admin.password")
                }
                value={formSeed.password}
                onChangeText={(text) => (form.current.password = text)}
                backgroundColor={palette.surfaceHighest}
                color={palette.text}
                borderColor={palette.border}
                placeholderTextColor="$gray10"
                size="$4"
                secureTextEntry
              />

              <View style={styles.statusToggleRow}>
                <Text style={styles.statusToggleLabel}>{t("admin.accountStatus")}</Text>
                <PressableScale
                  hapticFeedback
                  onPress={() => setIsActive(!isActive)}
                  style={[
                    styles.statusPill,
                    isActive ? styles.statusPillActive : styles.statusPillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isActive
                        ? styles.statusPillTextActive
                        : styles.statusPillTextInactive,
                    ]}
                  >
                    {isActive ? t("admin.filterActive") : t("admin.filterInactive")}
                  </Text>
                </PressableScale>
              </View>

              <PrimaryButton
                label={editingUser ? t("admin.updateUser") : t("admin.createUser")}
                loading={uploading}
                size="lg"
                onPress={handleSaveUser}
              />
            </ScrollView>
          </Sheet.Frame>
        </Sheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  skeletonWrap: { padding: spacing.lg, gap: spacing.sm },
  headerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.lg },
  attentionChip: {
    minWidth: 140,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  attentionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attentionCount: { fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },
  attentionLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heading: {
    color: palette.text,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  chartCard: {
    backgroundColor: palette.surfaceElevated,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderColor: palette.border,
    borderWidth: 1,
    ...shadow(2),
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sparkStrip: { marginBottom: spacing.md },
  chartTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  pillRow: { flexDirection: "row", gap: 6 },
  pill: {
    width: 32,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: { backgroundColor: palette.primarySoft },
  pillText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  pillTextActive: { color: palette.primaryBright },
  chartFootnote: {
    color: palette.textTertiary,
    fontSize: 12,
    textAlign: "center",
    marginTop: -spacing.xs,
  },
  userSection: { gap: spacing.md, marginBottom: spacing.md },
  searchWrap: {
    backgroundColor: palette.surfaceElevated,
    height: 50,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderColor: palette.border,
    borderWidth: 1,
  },
  filterRow: { flexDirection: "row", gap: spacing.sm },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
  },
  filterTabActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterText: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
  filterTextActive: { color: "#FFFFFF" },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderColor: palette.surfaceElevated,
    borderWidth: 2,
  },
  editIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    bottom: 95,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(6),
  },
  statusToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.surfaceHighest,
    padding: spacing.md,
    borderRadius: radius.md,
    borderColor: palette.border,
    borderWidth: 1,
  },
  statusToggleLabel: { color: palette.text, fontSize: 14 },
  statusPill: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
  },
  statusPillActive: { backgroundColor: `${palette.success}22` },
  statusPillInactive: { backgroundColor: `${palette.danger}22` },
  statusPillText: { fontSize: 13, fontWeight: "700" },
  statusPillTextActive: { color: palette.success },
  statusPillTextInactive: { color: palette.danger },
});
