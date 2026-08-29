import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "tamagui";
import {
  EmptyState,
  PressableScale,
  ScreenHeader,
  SkeletonListRow,
  StaggerItem,
} from "../src/components/ui";
import { palette, radius, spacing } from "../src/theme/tokens";
import { useAuth } from "../src/context/AuthContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

export default function AdminShipmentsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- Fetch/sort logic preserved exactly ---
  const fetchShipments = async () => {
    try {
      if (!refreshing) setLoading(true);
      const { data } = await axios.get(`${API_URL}/shipments`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setShipments(
        data.sort(
          (a: any, b: any) =>
            new Date(b.shippedAt).getTime() - new Date(a.shippedAt).getTime(),
        ),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchShipments();
    }, []),
  );

  // --- Optimistic status update preserved exactly ---
  const handleUpdateStatus = async (id: string, updates: any) => {
    try {
      await axios.put(`${API_URL}/shipments/${id}`, updates, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setShipments((prev: any) =>
        prev.map((s: any) => (s._id === id ? { ...s, ...updates } : s)),
      );
    } catch (error) {
      Alert.alert("Error", "Update failed");
    }
  };

  const renderShipment = ({ item, index }: any) => {
    const isPending = item.status === "pending";
    const isUnpaid = item.paymentStatus === "unpaid";

    return (
      <StaggerItem index={index}>
        <View style={styles.card}>
          {/* Header: User & Date */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Avatar circular size="$3">
                <Avatar.Image
                  src={`https://ui-avatars.com/api/?name=${item.sender?.name}&background=random`}
                />
                <Avatar.Fallback backgroundColor={palette.primary} />
              </Avatar>
              <View>
                <Text style={styles.userName}>
                  {item.sender?.name || "Unknown User"}
                </Text>
                <Text style={styles.dateText}>
                  {new Date(item.shippedAt).toDateString()}
                </Text>
              </View>
            </View>
            <View style={styles.idBadge}>
              <Text style={styles.idText}>#{item._id.slice(-4).toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Stats */}
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statLabel}>QUANTITY</Text>
              <Text style={styles.statValue}>{item.totalQuantity}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.statLabel}>PAYOUT VALUE</Text>
              <Text style={[styles.statValue, { color: palette.accent }]}>
                ₹ {item.totalAmount}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <PressableScale
              disabled={!isPending}
              hapticFeedback={isPending}
              onPress={() =>
                isPending && handleUpdateStatus(item._id, { status: "received" })
              }
              style={[
                styles.actionBtn,
                isPending ? styles.actionReceived : styles.actionDone,
              ]}
            >
              <Feather
                name="check"
                size={14}
                color={isPending ? palette.success : palette.textTertiary}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: isPending ? palette.success : palette.textTertiary },
                ]}
              >
                {isPending ? "Mark Received" : "Received"}
              </Text>
            </PressableScale>

            <PressableScale
              disabled={!isUnpaid}
              hapticFeedback={isUnpaid}
              onPress={() =>
                isUnpaid && handleUpdateStatus(item._id, { paymentStatus: "paid" })
              }
              style={[
                styles.actionBtn,
                isUnpaid ? styles.actionPaid : styles.actionDone,
              ]}
            >
              <Feather
                name="check"
                size={14}
                color={isUnpaid ? palette.primaryBright : palette.textTertiary}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: isUnpaid ? palette.primaryBright : palette.textTertiary },
                ]}
              >
                {isUnpaid ? "Mark Paid" : "Paid"}
              </Text>
            </PressableScale>
          </View>
        </View>
      </StaggerItem>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={styles.flex}>
        <View style={styles.headerPad}>
          <ScreenHeader
            title="Manage Shipments"
            subtitle="ADMINISTRATION"
            onBack={() => router.back()}
          />
        </View>

        {loading && !refreshing ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonListRow key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            data={shipments}
            keyExtractor={(item: any) => item._id}
            renderItem={renderShipment}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchShipments();
            }}
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  icon="inbox"
                  title="No shipments found"
                  message="All incoming shipments will appear here for approval."
                />
              ) : null
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
  skeletonWrap: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  userName: { color: palette.text, fontWeight: "700", fontSize: 14 },
  dateText: { color: palette.textSecondary, fontSize: 11, marginTop: 2 },
  idBadge: {
    backgroundColor: palette.surfaceHighest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  idText: { color: palette.textSecondary, fontSize: 10, fontWeight: "600" },
  divider: { height: 1, backgroundColor: palette.border, marginBottom: spacing.md },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  statLabel: {
    color: palette.textTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 3,
    letterSpacing: -0.3,
  },
  actionRow: { flexDirection: "row", gap: spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  actionReceived: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: palette.success,
  },
  actionPaid: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  actionDone: {
    backgroundColor: palette.surfaceHighest,
    borderColor: palette.border,
  },
  actionText: { fontSize: 13, fontWeight: "700" },
});
