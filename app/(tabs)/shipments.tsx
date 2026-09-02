import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EmptyState,
  ListRow,
  OfflineBanner,
  PressableScale,
  ShareShipmentModal,
  SkeletonListRow,
  StaggerItem,
  StatusBadge,
  useToast,
} from "../../src/components/ui";
import { palette, radius, shadow, spacing } from "../../src/theme/tokens";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { cachedGet } from "../../src/utils/apiCache";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

export default function ShipmentHistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Offline resilience: shows the banner when the list came from cache.
  const [staleSince, setStaleSince] = useState<number | null>(null);

  // Share modal state
  const [shareTarget, setShareTarget] = useState<any>(null);
  const [shareLoading, setShareLoading] = useState(false);

  // The /myshipments list returns bare product IDs; fetch the full shipment
  // (populated) before opening the share receipt.
  const openShare = async (shipmentId: string) => {
    try {
      setShareLoading(true);
      const { data } = await axios.get(`${API_URL}/shipments/${shipmentId}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setShareTarget(data);
    } catch (error) {
      console.error(error);
      showToast({ message: t("detail.couldNotLoad"), kind: "error" });
    } finally {
      setShareLoading(false);
    }
  };

  // --- Fetch/sort logic preserved exactly (axios → cachedGet swap only) ---
  const fetchHistory = async () => {
    try {
      if (!refreshing) setLoading(true);
      const res = await cachedGet<any[]>(
        "shipments:mine",
        `${API_URL}/shipments/myshipments`,
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );
      setStaleSince(res.stale ? res.savedAt : null);
      // Sort: Newest first
      setShipments(
        res.data.sort(
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
      fetchHistory();
    }, []),
  );

  const renderItem = ({ item, index }: any) => {
    const isPending = item.status === "pending";

    return (
      <ListRow
        index={index}
        onPress={() =>
          router.push({
            pathname: "/shipment/[id]",
            params: { id: item._id },
          })
        }
        leading={
          <View style={styles.dateBadge}>
            <Feather name="calendar" size={13} color={palette.textTertiary} />
            <Text style={styles.dateText}>
              {new Date(item.shippedAt).toLocaleDateString()}
            </Text>
          </View>
        }
        title={`${item.totalQuantity} ${t("shipments.units")}`}
        subtitle={`${item.items.length} ${t("shipments.productTypes")}`}
        trailing={
          <View style={styles.trailingWrap}>
            <View style={styles.badgeRow}>
              <StatusBadge status={item.status} />
              {item.paymentStatus && (
                <StatusBadge
                  status={item.paymentStatus}
                  label={item.paymentStatus === "paid" ? "PAID" : "UNPAID"}
                />
              )}
            </View>
            <View style={styles.trailingActions}>
              {isPending ? (
                <PressableScale
                  style={styles.editBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/shipment-edit",
                      params: { shipmentId: item._id },
                    })
                  }
                >
                  <Feather name="edit-2" size={13} color="#FFFFFF" />
                  <Text style={styles.editBtnText}>{t("common.edit")}</Text>
                </PressableScale>
              ) : (
                <View style={styles.payoutCol}>
                  <Text style={styles.payoutLabel}>{t("detail.payout")}</Text>
                  <Text style={styles.payoutValue}>₹ {item.totalAmount}</Text>
                </View>
              )}
              {/* Share */}
              <PressableScale
                hapticFeedback
                style={styles.shareBtn}
                onPress={() => openShare(item._id)}
              >
                <Feather name="share-2" size={14} color={palette.primaryBright} />
              </PressableScale>
            </View>
          </View>
        }
        showChevron={false}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={styles.flex}>
        {/* Header */}
        <StaggerItem index={0} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overviewLabel}>{t("shipments.overview")}</Text>
            <Text style={styles.heading}>{t("shipments.history")}</Text>
          </View>
          <PressableScale
            hapticFeedback
            onPress={() => {
              setRefreshing(true);
              fetchHistory();
            }}
            style={styles.refreshBtn}
          >
            <Feather name="refresh-cw" size={17} color={palette.textSecondary} />
          </PressableScale>
        </StaggerItem>

        {staleSince !== null && (
          <View style={styles.bannerWrap}>
            <OfflineBanner savedAt={staleSince} />
          </View>
        )}

        {/* List */}
        {loading && shipments.length === 0 ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonListRow key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            data={shipments}
            keyExtractor={(item: any) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchHistory();
                }}
                tintColor={palette.primary}
                colors={[palette.primary]}
              />
            }
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  icon="inbox"
                  title={t("shipments.noShipments")}
                  message={t("shipments.emptyMessage")}
                  actionLabel={t("shipments.newShipment")}
                  onAction={() => router.push("/shipment-new")}
                />
              ) : null
            }
          />
        )}

        {/* FAB */}
        <PressableScale
          onPress={() => router.push("/shipment-new")}
          hapticFeedback
          style={styles.fab}
        >
          <Feather name="plus" size={27} color="#FFFFFF" />
        </PressableScale>
      </View>

      {/* Share receipt (same flow as post-create) */}
      {shareLoading ? (
        <View style={styles.shareLoaderWrap}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <ShareShipmentModal
          visible={shareTarget != null}
          onClose={() => setShareTarget(null)}
          heading={
            shareTarget
              ? `Shipment #${shareTarget._id.slice(-4).toUpperCase()}`
              : ""
          }
          ownerName={user?.name}
          items={(shareTarget?.items || []).map((item: any) => ({
            name: item.product?.name || "Unknown",
            brand: item.product?.brand,
            photoUrl: item.product?.photoUrl,
            quantity: item.quantity,
            value: item.quantity * (user?.priceAllotted || 0),
          }))}
          totalItems={shareTarget?.totalQuantity ?? 0}
          totalValue={shareTarget?.totalAmount ?? 0}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  overviewLabel: {
    color: palette.textSecondary,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  heading: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonWrap: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  bannerWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: palette.surfaceHighest,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
  },
  dateText: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  trailingWrap: { alignItems: "flex-end", gap: 8 },
  badgeRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  trailingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shareBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: `${palette.primary}33`,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  editBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  payoutCol: { alignItems: "flex-end" },
  payoutLabel: {
    color: palette.textTertiary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  payoutValue: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 1,
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
  shareLoaderWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
