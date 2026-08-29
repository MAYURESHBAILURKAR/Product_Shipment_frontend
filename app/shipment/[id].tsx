import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  GlassCard,
  PressableScale,
  ScreenHeader,
  SectionHeader,
  ShareShipmentModal,
  StaggerItem,
  StatusBadge,
} from "../../src/components/ui";
import { palette, radius, spacing } from "../../src/theme/tokens";
import { useAuth } from "../../src/context/AuthContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

export default function ShipmentDetailsScreen() {
  const { id } = useLocalSearchParams(); // Get the ID from the route
  const router = useRouter();
  const { user } = useAuth();

  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchShipmentDetails();
    }
  }, [id]);

  // --- Fetch logic preserved exactly ---
  const fetchShipmentDetails = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/shipments/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      setShipment(data);
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "Could not load shipment details.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          scrollEnabled={false}
        >
          <View style={styles.skeletonCard} />
          <View style={[styles.skeletonCard, { height: 80 }]} />
          <View style={[styles.skeletonCard, { height: 60 }]} />
          <View style={[styles.skeletonCard, { height: 60 }]} />
        </ScrollView>
      </View>
    );
  }

  if (!shipment) return null;

  const isPending = shipment.status === "pending";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 1. Header */}
        <View style={styles.headerPad}>
          <ScreenHeader
            title="Details"
            onBack={() => router.back()}
            right={
              <View style={styles.headerActions}>
                <PressableScale
                  hapticFeedback
                  onPress={() => setShareOpen(true)}
                  style={editStyles.btn}
                >
                  <Feather name="share-2" size={15} color={palette.primaryBright} />
                  <Text style={editStyles.label}>Share</Text>
                </PressableScale>
                {isPending && (
                  <PressableEditBtn
                    onPress={() =>
                      router.push({
                        pathname: "/shipment-edit",
                        params: { shipmentId: id },
                      })
                    }
                  />
                )}
              </View>
            }
          />
        </View>

        <View style={styles.wrap}>
          {/* 2. Status Card */}
          <StaggerItem index={0}>
            <GlassCard padding={20}>
              <View style={styles.statusTop}>
                <View>
                  <Text style={styles.idLabel}>SHIPMENT ID</Text>
                  <Text style={styles.idValue}>
                    #{typeof id === "string" ? id.slice(-6).toUpperCase() : "---"}
                  </Text>
                </View>
                <StatusBadge status={shipment.status} />
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Feather name="calendar" size={13} color={palette.textTertiary} />
                  <Text style={styles.metaText}>
                    {new Date(shipment.shippedAt).toDateString()}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Feather name="user" size={13} color={palette.textTertiary} />
                  <Text style={styles.metaText}>
                    {shipment.sender?.name || user?.name}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </StaggerItem>

          {/* 3. Financial Stats */}
          <StaggerItem index={1} style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL QTY</Text>
              <Text style={styles.statValue}>{shipment.totalQuantity}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>PAYOUT</Text>
              <Text style={[styles.statValue, { color: palette.accent }]}>
                ₹ {shipment.totalAmount}
              </Text>
            </View>
          </StaggerItem>

          {/* 4. Items List */}
          <StaggerItem index={2}>
            <SectionHeader label="Shipment Contents" />
            <View style={styles.itemsCol}>
              {shipment.items.map((item: any, index: number) => {
                const productName = item.product?.name || "Unknown Item";
                const productBrand = item.product?.brand || "N/A";
                const productImg =
                  item.product?.photoUrl || "https://placehold.co/100";

                return (
                  <View key={index} style={styles.itemCard}>
                    <View style={styles.itemImageWrap}>
                      <RNImage
                        source={{ uri: productImg }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{productName}</Text>
                      <Text style={styles.itemBrand}>Brand: {productBrand}</Text>
                    </View>
                    <View style={styles.itemQty}>
                      <Text style={styles.itemQtyValue}>{item.quantity}</Text>
                      <Text style={styles.itemQtyLabel}>units</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </StaggerItem>

          {/* 5. Payment Status Footer */}
          <StaggerItem index={3}>
            <View
              style={[
                styles.paymentCard,
                shipment.paymentStatus === "paid" && styles.paymentPaid,
              ]}
            >
              <View style={styles.paymentLeft}>
                <View
                  style={[
                    styles.paymentIcon,
                    shipment.paymentStatus === "paid"
                      ? styles.paymentIconPaid
                      : styles.paymentIconPending,
                  ]}
                >
                  <Feather
                    name={shipment.paymentStatus === "paid" ? "check" : "clock"}
                    size={15}
                    color="#FFFFFF"
                  />
                </View>
                <View>
                  <Text style={styles.paymentTitle}>Payment Status</Text>
                  <Text style={styles.paymentSub}>
                    {shipment.paymentStatus === "paid"
                      ? "Funds have been transferred."
                      : "Waiting for admin approval."}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.paymentState,
                  shipment.paymentStatus === "paid"
                    ? { color: palette.success }
                    : { color: palette.textSecondary },
                ]}
              >
                {shipment.paymentStatus}
              </Text>
            </View>
          </StaggerItem>
        </View>
      </ScrollView>

      {/* Share receipt (same flow as post-create) */}
      <ShareShipmentModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        heading={`Shipment #${typeof id === "string" ? id.slice(-4).toUpperCase() : ""}`}
        ownerName={shipment.sender?.name || user?.name}
        items={shipment.items.map((item: any) => ({
          name: item.product?.name || "Unknown Item",
          brand: item.product?.brand || "N/A",
          photoUrl: item.product?.photoUrl,
          quantity: item.quantity,
          value: item.quantity * (user?.priceAllotted || 0),
        }))}
        totalItems={shipment.totalQuantity}
        totalValue={shipment.totalAmount}
      />
    </SafeAreaView>
  );
}

// Small ghost edit button for the header slot.
function PressableEditBtn({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale hapticFeedback onPress={onPress} style={editStyles.btn}>
      <Feather name="edit-2" size={15} color={palette.primaryBright} />
      <Text style={editStyles.label}>Edit</Text>
    </PressableScale>
  );
}

const editStyles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: `${palette.primary}33`,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  label: { color: palette.primaryBright, fontWeight: "700", fontSize: 13 },
});

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: palette.background },
  headerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  wrap: { paddingHorizontal: spacing.lg, gap: spacing.lg, marginTop: spacing.sm },
  statusTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  idLabel: {
    color: palette.textTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  idValue: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 3,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: palette.textSecondary, fontSize: 12 },
  statRow: { flexDirection: "row", gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: palette.surfaceElevated,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderColor: palette.border,
    borderWidth: 1,
  },
  statLabel: {
    color: palette.textTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: -0.3,
  },
  itemsCol: { gap: spacing.sm },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    borderColor: palette.border,
    borderWidth: 1,
  },
  itemImageWrap: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: palette.surface,
  },
  itemName: { color: palette.text, fontWeight: "700", fontSize: 14 },
  itemBrand: {
    color: palette.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  itemQty: { alignItems: "flex-end" },
  itemQtyValue: { color: palette.text, fontWeight: "700", fontSize: 16 },
  itemQtyLabel: {
    color: palette.textTertiary,
    fontSize: 10,
    marginTop: 1,
  },
  paymentCard: {
    backgroundColor: palette.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    borderColor: palette.border,
    borderWidth: 1,
  },
  paymentPaid: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: palette.success,
  },
  paymentLeft: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    flex: 1,
  },
  paymentIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIconPaid: { backgroundColor: palette.success },
  paymentIconPending: { backgroundColor: palette.textTertiary },
  paymentTitle: { color: palette.text, fontWeight: "700", fontSize: 14 },
  paymentSub: { color: palette.textSecondary, fontSize: 11, marginTop: 2 },
  paymentState: {
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  skeletonCard: {
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceElevated,
  },
});
