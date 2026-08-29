import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EmptyState,
  PressableScale,
  ScreenHeader,
  SkeletonListRow,
  StaggerItem,
} from "../src/components/ui";
import { palette, radius, spacing } from "../src/theme/tokens";
import { useAuth } from "../src/context/AuthContext";

// ⚠️ REPLACE IP
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ShipmentTrackerScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter State
  const [timeFilter, setTimeFilter] = useState("month");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Pending, Received
  const [selectedUser, setSelectedUser] = useState("all");
  const [customDate, setCustomDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- Fetch logic preserved exactly ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint =
        user?.role === "admin" ? "/shipments" : "/shipments/myshipments";
      const { data } = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      // Sort by newest first
      setAllShipments(
        data.sort(
          (a: any, b: any) =>
            new Date(b.shippedAt).getTime() - new Date(a.shippedAt).getTime(),
        ),
      );

      if (user?.role === "admin") {
        const userRes = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        setUsers(userRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  // --- Filter logic preserved exactly (user → status → time) ---
  const filteredData = useMemo(() => {
    let data = allShipments;

    // 1. User Filter
    if (user?.role === "admin" && selectedUser !== "all") {
      data = data.filter(
        (item) =>
          item.sender?._id === selectedUser || item.sender === selectedUser,
      );
    }

    // 2. Status Filter
    if (statusFilter !== "All") {
      data = data.filter(
        (item) => item.status.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    // 3. Time Filter
    const now = new Date();
    data = data.filter((item) => {
      const itemDate = new Date(item.shippedAt);
      switch (timeFilter) {
        case "day":
          return itemDate.toDateString() === customDate.toDateString();
        case "week":
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return itemDate >= oneWeekAgo;
        case "month":
          return (
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear()
          );
        case "year":
          return itemDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
    return data;
  }, [allShipments, timeFilter, selectedUser, customDate, statusFilter]);

  const statusMeta = (status: string) => {
    switch (status) {
      case "received":
        return { color: palette.success, icon: "check-circle" as const };
      case "pending":
        return { color: palette.warning, icon: "clock" as const };
      default:
        return { color: palette.accent, icon: "package" as const };
    }
  };

  const renderItem = ({ item, index }: any) => {
    const { color, icon } = statusMeta(item.status);

    return (
      <StaggerItem index={index % 8} travelY={10}>
        <PressableScale
          hapticFeedback
          onPress={() =>
            router.push({
              pathname: "/shipment/[id]",
              params: { id: item._id },
            })
          }
          style={styles.card}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardLeft}>
              {/* Icon Box */}
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: `${color}1F`,
                    borderColor: `${color}55`,
                  },
                ]}
              >
                <Feather name={icon} size={19} color={color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.shipmentId}>
                  Shipment #{item._id.slice(-4).toUpperCase()}
                </Text>
                {user?.role === "admin" && (
                  <Text style={styles.senderName}>
                    {item.sender?.name || "User"}
                  </Text>
                )}
                <Text style={styles.dateText}>
                  {new Date(item.shippedAt).toDateString()}
                </Text>
              </View>

              {/* Status Pill */}
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: `${color}1F`, borderColor: `${color}55` },
                ]}
              >
                <Text style={[styles.statusText, { color }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statLabel}>ITEMS</Text>
              <Text style={styles.statValue}>{item.totalQuantity}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.statLabel}>VALUE</Text>
              <Text style={[styles.statValue, { color: palette.accent }]}>
                ₹ {item.totalAmount}
              </Text>
            </View>
          </View>
        </PressableScale>
      </StaggerItem>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={styles.flex}>
        {/* Header */}
        <View style={styles.headerPad}>
          <ScreenHeader
            title="Shipment Logs"
            subtitle="HISTORY & TRACKING"
            onBack={() => router.back()}
            right={
              <PressableScale
                hapticFeedback
                onPress={() => setShowDatePicker(true)}
                style={styles.calendarBtn}
              >
                <Feather
                  name="calendar"
                  size={17}
                  color={timeFilter === "day" ? palette.primaryBright : palette.textTertiary}
                />
              </PressableScale>
            }
          />
        </View>

        {/* --- FILTERS SECTION --- */}
        <View style={styles.filtersWrap}>
          {/* 1. Status Tabs (Pills) */}
          <StaggerItem index={0}>
            <View style={styles.pillRow}>
              {["All", "Pending", "Received"].map((status) => {
                const active = statusFilter === status;
                return (
                  <PressableScale
                    key={status}
                    hapticFeedback
                    onPress={() => setStatusFilter(status)}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        active && styles.pillTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </StaggerItem>

          {/* 2. Time Filters (Text Links) */}
          <StaggerItem index={1}>
            <View style={styles.timeRow}>
              {["week", "month", "year", "all"].map((tf) => {
                const active = timeFilter === tf;
                return (
                  <PressableScale
                    key={tf}
                    hapticFeedback
                    onPress={() => setTimeFilter(tf)}
                    style={styles.timeBtn}
                  >
                    <Text style={[styles.timeText, active && styles.timeTextActive]}>
                      {tf}
                    </Text>
                    {active && <View style={styles.timeUnderline} />}
                  </PressableScale>
                );
              })}
            </View>
          </StaggerItem>

          {showDatePicker && (
            <DateTimePicker
              value={customDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) {
                  setCustomDate(date);
                  setTimeFilter("day");
                }
              }}
            />
          )}

          {/* 3. User Chips (Admin Only) */}
          {user?.role === "admin" && (
            <StaggerItem index={2}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.userChipsContent}
              >
                <PressableScale
                  hapticFeedback
                  onPress={() => setSelectedUser("all")}
                  style={[
                    styles.userChip,
                    selectedUser === "all" && styles.userChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.userChipText,
                      selectedUser === "all" && styles.userChipTextActive,
                    ]}
                  >
                    All Users
                  </Text>
                </PressableScale>
                {users.map((u) => {
                  const active = selectedUser === u._id;
                  return (
                    <PressableScale
                      key={u._id}
                      hapticFeedback
                      onPress={() => setSelectedUser(u._id)}
                      style={[styles.userChip, active && styles.userChipActive]}
                    >
                      <Text
                        style={[
                          styles.userChipText,
                          active && styles.userChipTextActive,
                        ]}
                      >
                        {u.name}
                      </Text>
                    </PressableScale>
                  );
                })}
              </ScrollView>
            </StaggerItem>
          )}

          {/* Active day-filter indicator */}
          {timeFilter === "day" && (
            <View style={styles.dayBanner}>
              <Feather name="calendar" size={13} color={palette.primaryBright} />
              <Text style={styles.dayBannerText}>
                Showing {customDate.toDateString()}
              </Text>
              <PressableScale
                hapticFeedback
                onPress={() => setTimeFilter("month")}
                style={styles.dayBannerClear}
              >
                <Feather name="x" size={12} color={palette.textSecondary} />
              </PressableScale>
            </View>
          )}
        </View>

        {/* --- LIST --- */}
        {loading ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonListRow key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item: any) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="inbox"
                title="No logs found"
                message="No shipments match these filters."
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  filtersWrap: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
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
  pillRow: {
    flexDirection: "row",
    backgroundColor: palette.surfaceElevated,
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  pillActive: { backgroundColor: palette.primary },
  pillText: {
    color: palette.textSecondary,
    fontWeight: "600",
    fontSize: 13,
  },
  pillTextActive: { color: "#FFFFFF" },
  timeRow: {
    flexDirection: "row",
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    paddingBottom: 0,
  },
  timeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  timeText: {
    color: palette.textTertiary,
    fontSize: 13,
    textTransform: "capitalize",
    fontWeight: "500",
  },
  timeTextActive: {
    color: palette.primaryBright,
    fontWeight: "700",
  },
  timeUnderline: {
    width: 20,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: palette.primary,
    marginTop: 5,
  },
  userChipsContent: { gap: spacing.sm, paddingVertical: 2 },
  userChip: {
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  userChipActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  userChipText: { color: palette.textSecondary, fontSize: 12, fontWeight: "600" },
  userChipTextActive: { color: palette.primaryBright },
  dayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: `${palette.primary}33`,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  dayBannerText: {
    color: palette.primaryBright,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  dayBannerClear: { padding: 2 },
  skeletonWrap: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
  },
  cardTop: { marginBottom: spacing.md },
  cardLeft: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  shipmentId: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: -0.2,
  },
  senderName: { color: palette.primaryBright, fontSize: 12, marginTop: 1 },
  dateText: { color: palette.textSecondary, fontSize: 11, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statLabel: {
    color: palette.textTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statValue: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 3,
    letterSpacing: -0.3,
  },
});
