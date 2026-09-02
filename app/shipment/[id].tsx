import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AppDialog,
  GlassCard,
  PressableScale,
  PrimaryButton,
  ScreenHeader,
  SectionHeader,
  ShareShipmentModal,
  StaggerItem,
  StatusBadge,
  useToast,
} from "../../src/components/ui";
import { palette, radius, spacing } from "../../src/theme/tokens";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/i18n/LanguageProvider";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

export default function ShipmentDetailsScreen() {
  const { id } = useLocalSearchParams(); // Get the ID from the route
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [paidDialog, setPaidDialog] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  // Timeline steps: shipped is always done (it exists); received/paid depend
  // on status/paymentStatus. updatedAt approximates the received-at time.
  const timeline = useMemo(() => {
    if (!shipment) return [];
    const received = shipment.status === "received";
    const paid = shipment.paymentStatus === "paid";
    return [
      {
        key: "shipped",
        title: t("detail.shipped"),
        caption: t("detail.shippedCaption", { count: shipment.totalQuantity }),
        at: shipment.shippedAt,
        done: true,
      },
      {
        key: "received",
        title: t("detail.received"),
        caption: t("detail.receivedCaption"),
        at: received ? shipment.updatedAt || shipment.shippedAt : null,
        done: received,
      },
      {
        key: "paid",
        title: t("detail.paid"),
        caption: t("detail.paidCaption"),
        at: paid ? shipment.updatedAt || null : null,
        done: paid,
      },
    ];
  }, [shipment]);

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
      showToast({ message: t("detail.couldNotLoad"), kind: "error" });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Same PUT the admin screen uses; optimistic local update on success.
  const handleMarkPaid = async () => {
    try {
      setMarkingPaid(true);
      await axios.put(
        `${API_URL}/shipments/${id}`,
        { paymentStatus: "paid" },
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );
      setShipment((prev: any) => ({
        ...prev,
        paymentStatus: "paid",
        // Server auto-receives on paid; mirror it locally so the timeline
        // and status badge update in the same render.
        ...(prev.status === "pending"
          ? { status: "received", receivedAt: new Date().toISOString() }
          : {}),
      }));
      showToast({ message: t("detail.markedAsPaid"), kind: "success" });
    } catch (error) {
      console.error("Mark paid error:", error);
      showToast({ message: t("detail.couldNotUpdatePayment"), kind: "error" });
    } finally {
      setMarkingPaid(false);
      setPaidDialog(false);
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
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* 1. Header */}
        <View style={styles.headerPad}>
          <ScreenHeader
            title={t("detail.details")}
            onBack={() => router.back()}
            right={
              <View style={styles.headerActions}>
                <PressableScale
                  hapticFeedback
                  onPress={() => setShareOpen(true)}
                  style={editStyles.btn}
                >
                  <Feather name="share-2" size={15} color={palette.primaryBright} />
                  <Text style={editStyles.label}>{t("common.share")}</Text>
                </PressableScale>
                {isPending && (
                  <PressableEditBtn
                    label={t("common.edit")}
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
                  <Text style={styles.idLabel}>{t("detail.shipmentId")}</Text>
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
              <Text style={styles.statLabel}>{t("detail.totalQty")}</Text>
              <Text style={styles.statValue}>{shipment.totalQuantity}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t("detail.payout")}</Text>
              <Text style={[styles.statValue, { color: palette.accent }]}>
                ₹ {shipment.totalAmount}
              </Text>
            </View>
          </StaggerItem>

          {/* 4. Items List */}
          <StaggerItem index={2}>
            <SectionHeader label={t("detail.contents")} />
            <View style={styles.itemsCol}>
              {shipment.items.map((item: any, index: number) => {
                const productName = item.product?.name || t("detail.unknownItem");
                const productBrand = item.product?.brand || t("common.na");
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
                      <Text style={styles.itemBrand}>{t("detail.brand")}{productBrand}</Text>
                    </View>
                    <View style={styles.itemQty}>
                      <Text style={styles.itemQtyValue}>{item.quantity}</Text>
                      <Text style={styles.itemQtyLabel}>{t("detail.units")}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </StaggerItem>

          {/* 5. Timeline Stepper */}
          <StaggerItem index={3}>
            <SectionHeader label={t("detail.timeline")} />
            <View style={styles.timelineCard}>
              {timeline.map((step, i) => (
                <View key={step.key} style={styles.timelineRow}>
                  {/* Rail: dot + connecting line */}
                  <View style={styles.timelineRail}>
                    <View
                      style={[
                        styles.timelineDot,
                        step.done && styles.timelineDotDone,
                        step.key === "paid" && step.done && styles.timelineDotPaid,
                      ]}
                    >
                      {step.done ? (
                        <Feather
                          name="check"
                          size={11}
                          color="#FFFFFF"
                        />
                      ) : null}
                    </View>
                    {i < timeline.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          timeline[i + 1]?.done && styles.timelineLineDone,
                        ]}
                      />
                    )}
                  </View>

                  {/* Content */}
                  <View
                    style={[
                      styles.timelineBody,
                      i === timeline.length - 1 && styles.timelineBodyLast,
                    ]}
                  >
                    <View style={styles.timelineTitleRow}>
                      <Text
                        style={[
                          styles.timelineTitle,
                          !step.done && styles.timelineTitlePending,
                        ]}
                      >
                        {step.title}
                      </Text>
                      {step.at && (
                        <Text style={styles.timelineTime}>
                          {new Date(step.at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          ·{" "}
                          {new Date(step.at).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.timelineCaption,
                        !step.done && styles.timelineCaptionPending,
                      ]}
                    >
                      {step.caption}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </StaggerItem>

          {/* 6. Payment Status Footer */}
          <StaggerItem index={4}>
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
                  <Text style={styles.paymentTitle}>{t("detail.paymentStatus")}</Text>
                  <Text style={styles.paymentSub}>
                    {shipment.paymentStatus === "paid"
                      ? t("detail.fundsTransferred")
                      : t("detail.payoutNotConfirmed")}
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

      {/* Mark as Paid — pinned footer so it stays visible without scrolling */}
      {shipment.paymentStatus !== "paid" && (
        <View style={styles.paidFooter}>
          <PrimaryButton
            label={t("detail.markAsPaid")}
            icon="check"
            size="md"
            onPress={() => setPaidDialog(true)}
          />
        </View>
      )}

      {/* Share receipt (same flow as post-create) */}
      <ShareShipmentModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        heading={t("detail.shipmentHeading", { id: typeof id === "string" ? id.slice(-4).toUpperCase() : "" })}
        ownerName={shipment.sender?.name || user?.name}
        items={shipment.items.map((item: any) => ({
          name: item.product?.name || t("detail.unknownItem"),
          brand: item.product?.brand || t("common.na"),
          photoUrl: item.product?.photoUrl,
          quantity: item.quantity,
          value: item.quantity * (user?.priceAllotted || 0),
        }))}
        totalItems={shipment.totalQuantity}
        totalValue={shipment.totalAmount}
      />

      {/* Mark as Paid confirmation */}
      <AppDialog
        visible={paidDialog}
        title={t("detail.markPaidTitle")}
        message={t("detail.markPaidMessage")}
        icon="check-circle"
        kind="success"
        buttons={[
          {
            label: t("common.cancel"),
            style: "cancel",
            onPress: () => setPaidDialog(false),
          },
          {
            label: t("detail.markPaid"),
            style: "confirm",
            onPress: handleMarkPaid,
          },
        ]}
      />
    </SafeAreaView>
  );
}

// Small ghost edit button for the header slot.
function PressableEditBtn({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale hapticFeedback onPress={onPress} style={editStyles.btn}>
      <Feather name="edit-2" size={15} color={palette.primaryBright} />
      <Text style={editStyles.label}>{label}</Text>
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
  paidFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    padding: spacing.lg,
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
  timelineCard: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  timelineRow: { flexDirection: "row" },
  timelineRail: {
    width: 28,
    alignItems: "center",
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surfaceHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotDone: {
    borderColor: palette.success,
    backgroundColor: palette.success,
  },
  timelineDotPaid: { borderColor: palette.accent, backgroundColor: palette.accent },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: palette.borderStrong,
    marginVertical: 2,
    borderRadius: 1,
  },
  timelineLineDone: { backgroundColor: palette.success },
  timelineBody: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  timelineBodyLast: { paddingBottom: spacing.xs },
  timelineTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  timelineTitlePending: { color: palette.textSecondary },
  timelineTime: {
    color: palette.textTertiary,
    fontSize: 10.5,
    fontWeight: "600",
  },
  timelineCaption: {
    color: palette.textSecondary,
    fontSize: 11.5,
    marginTop: 2,
  },
  timelineCaptionPending: { color: palette.textTertiary },
  skeletonCard: {
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceElevated,
  },
});
