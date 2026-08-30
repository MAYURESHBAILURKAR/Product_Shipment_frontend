import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DateRange,
  DateRangeSheet,
  EmptyState,
  ExportSheet,
  ExportFormat,
  PressableScale,
  ScreenHeader,
  SkeletonListRow,
  StaggerItem,
  useToast,
} from "../src/components/ui";
import { palette, radius, spacing } from "../src/theme/tokens";
import { useAuth } from "../src/context/AuthContext";
import {
  buildStatementHtml,
  copyText,
  sharePdf,
  statementToCsv,
  StatementRow,
} from "../src/utils/shipmentExport";

// ⚠️ REPLACE IP
const API_URL = process.env.EXPO_PUBLIC_API_URL;

type SortMode = "date-desc" | "date-asc" | "value-desc" | "value-asc" | "qty-desc";

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "date-desc", label: "Newest first" },
  { key: "date-asc", label: "Oldest first" },
  { key: "value-desc", label: "Highest value" },
  { key: "value-asc", label: "Lowest value" },
  { key: "qty-desc", label: "Most items" },
];

const prettyDate = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const prettyRange = (range: DateRange) =>
  range.startDate === range.endDate
    ? prettyDate(range.startDate)
    : `${prettyDate(range.startDate)} → ${prettyDate(range.endDate)}`;

// Human label of the active filters for the export sheet subtitle.
const describePeriod = (
  timeFilter: string,
  dateRange: DateRange | null,
): string => {
  if (timeFilter === "custom" && dateRange) return prettyRange(dateRange);
  switch (timeFilter) {
    case "week":
      return "Last 7 days";
    case "month":
      return "This month";
    case "year":
      return "This year";
    default:
      return "All time";
  }
};

export default function ShipmentTrackerScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter State
  const [timeFilter, setTimeFilter] = useState("month");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Pending, Received
  const [selectedUser, setSelectedUser] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [showDateSheet, setShowDateSheet] = useState(false);

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date-desc");
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);

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
        case "custom":
          if (!dateRange) return true;
          // Inclusive range: start of startDate → end of endDate
          return (
            itemDate >= new Date(`${dateRange.startDate}T00:00:00`) &&
            itemDate <= new Date(`${dateRange.endDate}T23:59:59.999`)
          );
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

    // 4. Search (shipment id / user name / status)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      data = data.filter(
        (item) =>
          item._id.toLowerCase().includes(q) ||
          (item.sender?.name || "").toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q),
      );
    }

    // 5. Sort
    const sorted = [...data].sort((a: any, b: any) => {
      switch (sortMode) {
        case "date-asc":
          return (
            new Date(a.shippedAt).getTime() - new Date(b.shippedAt).getTime()
          );
        case "value-desc":
          return b.totalAmount - a.totalAmount;
        case "value-asc":
          return a.totalAmount - b.totalAmount;
        case "qty-desc":
          return b.totalQuantity - a.totalQuantity;
        case "date-desc":
        default:
          return (
            new Date(b.shippedAt).getTime() - new Date(a.shippedAt).getTime()
          );
      }
    });
    return sorted;
  }, [
    allShipments,
    timeFilter,
    selectedUser,
    dateRange,
    statusFilter,
    searchQuery,
    sortMode,
  ]);

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

  // Export the currently filtered list (respects search/sort too).
  const handleExport = async (format: ExportFormat) => {
    setShowExportSheet(false);
    if (filteredData.length === 0) return;
    const showUser = user?.role === "admin";
    const rows: StatementRow[] = filteredData.map((item: any) => ({
      date: new Date(item.shippedAt).toLocaleDateString("en-GB"),
      ref: `#${item._id.slice(-4).toUpperCase()}`,
      user: item.sender?.name || user?.name || "",
      status: item.status,
      items: item.totalQuantity,
      amount: item.totalAmount,
    }));
    const periodLabel = describePeriod(timeFilter, dateRange);

    try {
      if (format === "pdf") {
        const ok = await sharePdf(
          buildStatementHtml({ rows, periodLabel, showUser, ownerName: user?.name }),
          "Share shipment statement",
        );
        if (!ok) throw new Error("unavailable");
      } else if (format === "csv") {
        const ok = await copyText(statementToCsv(rows, showUser));
        showToast(
          ok
            ? { message: "CSV copied to clipboard — paste into any spreadsheet.", kind: "success" }
            : { message: "Copy failed.", kind: "error" },
        );
      } else {
        const totalValue = rows.reduce((a, r) => a + r.amount, 0);
        const totalItems = rows.reduce((a, r) => a + r.items, 0);
        const text = [
          `Shipment Logs — ${periodLabel}`,
          showUser ? "" : `For: ${user?.name}`,
          `${rows.length} shipments · ${totalItems} items · ₹ ${totalValue}`,
          "",
          ...rows.map(
            (r) =>
              `${r.date} · ${r.ref}${showUser ? ` · ${r.user}` : ""} · ${r.status} · ${r.items} items · ₹ ${r.amount}`,
          ),
        ].join("\n");
        const ok = await copyText(text);
        showToast(
          ok
            ? { message: "Summary copied to clipboard.", kind: "success" }
            : { message: "Copy failed.", kind: "error" },
        );
      }
    } catch (error) {
      showToast({ message: "Export failed. Try again.", kind: "error" });
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
              <View style={styles.pillCol}>
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
                {item.paymentStatus && (
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          item.paymentStatus === "paid"
                            ? `${palette.success}1F`
                            : `${palette.textTertiary}1F`,
                        borderColor:
                          item.paymentStatus === "paid"
                            ? `${palette.success}55`
                            : `${palette.textTertiary}55`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.paymentStatus === "paid"
                              ? palette.success
                              : palette.textTertiary,
                        },
                      ]}
                    >
                      {item.paymentStatus === "paid" ? "PAID" : "UNPAID"}
                    </Text>
                  </View>
                )}
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
              <View style={styles.headerActions}>
                <PressableScale
                  hapticFeedback
                  onPress={() => setShowDateSheet(true)}
                  style={styles.calendarBtn}
                >
                  <Feather
                    name="calendar"
                    size={17}
                    color={timeFilter === "custom" ? palette.primaryBright : palette.textTertiary}
                  />
                </PressableScale>
                <PressableScale
                  hapticFeedback
                  onPress={() => setShowSortSheet(true)}
                  style={styles.calendarBtn}
                >
                  <Feather
                    name="sliders"
                    size={17}
                    color={sortMode !== "date-desc" ? palette.primaryBright : palette.textTertiary}
                  />
                </PressableScale>
                <PressableScale
                  hapticFeedback
                  onPress={() => setShowExportSheet(true)}
                  style={styles.calendarBtn}
                >
                  <Feather name="share-2" size={16} color={palette.textTertiary} />
                </PressableScale>
              </View>
            }
          />
        </View>

        {/* --- FILTERS SECTION --- */}
        <View style={styles.filtersWrap}>
          {/* 0. Search Bar */}
          <StaggerItem index={0}>
            <View style={styles.searchWrap}>
              <Feather name="search" size={15} color={palette.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search ID, user or status..."
                placeholderTextColor={palette.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <PressableScale
                  hapticFeedback
                  onPress={() => setSearchQuery("")}
                  style={styles.searchClear}
                >
                  <Feather name="x" size={13} color={palette.textSecondary} />
                </PressableScale>
              )}
            </View>
          </StaggerItem>

          {/* 1. Status Tabs (Pills) */}
          <StaggerItem index={1}>
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
          <StaggerItem index={2}>
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

          <DateRangeSheet
            visible={showDateSheet}
            onClose={() => setShowDateSheet(false)}
            initialRange={timeFilter === "custom" ? dateRange : null}
            onApply={(range) => {
              setShowDateSheet(false);
              if (range) {
                setDateRange(range);
                setTimeFilter("custom");
              } else {
                setDateRange(null);
                setTimeFilter("month");
              }
            }}
          />

          {/* 3. User Chips (Admin Only) */}
          {user?.role === "admin" && (
            <StaggerItem index={3}>
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

          {/* Active range-filter indicator */}
          {timeFilter === "custom" && dateRange && (
            <View style={styles.dayBanner}>
              <Feather name="calendar" size={13} color={palette.primaryBright} />
              <Text style={styles.dayBannerText}>
                Showing {prettyRange(dateRange)}
              </Text>
              <PressableScale
                hapticFeedback
                onPress={() => {
                  setDateRange(null);
                  setTimeFilter("month");
                }}
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

      {/* Sort options */}
      <SortSheet
        visible={showSortSheet}
        active={sortMode}
        onClose={() => setShowSortSheet(false)}
        onSelect={(mode) => {
          setSortMode(mode);
          setShowSortSheet(false);
        }}
      />

      {/* Export filtered logs */}
      <ExportSheet
        visible={showExportSheet}
        onClose={() => setShowExportSheet(false)}
        title="Export Shipment Logs"
        subtitle={`${filteredData.length} shipments · ${describePeriod(timeFilter, dateRange)}`}
        onFormat={handleExport}
        disabled={filteredData.length === 0}
      />
    </SafeAreaView>
  );
}

// Bottom sheet with sort options for the shipment list.
function SortSheet({
  visible,
  active,
  onClose,
  onSelect,
}: {
  visible: boolean;
  active: SortMode;
  onClose: () => void;
  onSelect: (mode: SortMode) => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <PressableScale
          hapticFeedback={false}
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        >
          <View style={styles.sheetDim} />
        </PressableScale>
        <View style={styles.sortSheetBody}>
          <View style={styles.sheetNotch} />
          <View style={styles.sortHeaderRow}>
            <Text style={styles.sortTitle}>Sort by</Text>
            <PressableScale hapticFeedback onPress={onClose} style={styles.sortCloseBtn}>
              <Feather name="x" size={15} color={palette.textSecondary} />
            </PressableScale>
          </View>
          <View style={styles.sortListCol}>
            {SORT_OPTIONS.map((opt) => {
              const isActive = active === opt.key;
              return (
                <PressableScale
                  key={opt.key}
                  hapticFeedback
                  onPress={() => onSelect(opt.key)}
                  style={[styles.sortRow, isActive && styles.sortRowActive]}
                >
                  <View style={[styles.sortRadio, isActive && styles.sortRadioActive]}>
                    {isActive && <View style={styles.sortRadioDot} />}
                  </View>
                  <Text style={[styles.sortLabel, isActive && styles.sortLabelActive]}>
                    {opt.label}
                  </Text>
                  {isActive && (
                    <Feather name="check" size={15} color={palette.primaryBright} />
                  )}
                </PressableScale>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
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
  headerActions: { flexDirection: "row", gap: spacing.sm },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    fontSize: 13.5,
    fontWeight: "500",
    paddingVertical: 0,
    includeFontPadding: false,
  },
  searchClear: { padding: 4 },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end" },
  sheetDim: { flex: 1, backgroundColor: "rgba(0,0,0,0.66)" },
  sortSheetBody: {
    backgroundColor: palette.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: palette.borderStrong,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  sheetNotch: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.borderStrong,
    marginBottom: spacing.md,
  },
  sortHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sortTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sortCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sortListCol: { gap: spacing.xs, paddingHorizontal: spacing.lg },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sortRowActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  sortRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: palette.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  sortRadioActive: { borderColor: palette.primary },
  sortRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primaryBright,
  },
  sortLabel: { color: palette.textSecondary, fontSize: 14, fontWeight: "600", flex: 1 },
  sortLabelActive: { color: palette.primaryBright, fontWeight: "700" },
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
  pillCol: { alignItems: "flex-end", gap: 5 },
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
