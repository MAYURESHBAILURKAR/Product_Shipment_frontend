import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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
  PressableScale,
  ProductFormSheet,
  ScreenHeader,
  StaggerItem,
  useToast,
} from "../../src/components/ui";
import { palette, radius, shadow, spacing } from "../../src/theme/tokens";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/i18n/LanguageProvider";

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/products`;

export default function ViewProductScreen() {
  const { id, data } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const product: any = JSON.parse(
    typeof data === "string" ? data : "{}",
  );

  const [editSheet, setEditSheet] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const performDelete = async () => {
    setDeleteDialog(false);
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      showToast({ message: t("products.removed"), kind: "success" });
      router.back();
    } catch (e) {
      showToast({ message: t("products.couldNotDelete"), kind: "error" });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrap}>
          <ScreenHeader
            title={t("products.product")}
            subtitle={t("products.viewDetails")}
            onBack={() => router.back()}
          />

          {/* Hero image */}
          <StaggerItem index={0}>
            <View style={styles.heroCard}>
              <RNImage
                source={{ uri: product?.photoUrl || "https://placehold.co/400" }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.skuBadge}>
                <Text style={styles.skuText}>
                  SKU-{String(id).slice(-3).toUpperCase()}
                </Text>
              </View>
            </View>
          </StaggerItem>

          {/* Name + stats */}
          <StaggerItem index={1}>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.brand}>{product?.brand}</Text>
                  <Text style={styles.productName}>{product?.name}</Text>
                </View>
                <View
                  style={[
                    styles.stockPill,
                    (product?.currentStock ?? 0) < 100 && styles.stockPillLow,
                  ]}
                >
                  <Feather
                    name="box"
                    size={13}
                    color={
                      (product?.currentStock ?? 0) < 100
                        ? palette.warning
                        : palette.success
                    }
                  />
                  <Text
                    style={[
                      styles.stockPillText,
                      (product?.currentStock ?? 0) < 100 && { color: palette.warning },
                    ]}
                  >
                    {(product?.currentStock ?? 0) < 100 ? t("products.lowStock") : t("products.inStock")}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Feather name="box" size={18} color={palette.primaryBright} />
                  <Text style={styles.statValue}>{product?.currentStock ?? 0}</Text>
                  <Text style={styles.statLabel}>{t("products.currentStock")}</Text>
                </View>
                <View style={styles.statBox}>
                  <Feather name="tag" size={18} color={palette.accent} />
                  <Text style={styles.statValue}>₹ {user?.priceAllotted ?? 0}</Text>
                  <Text style={styles.statLabel}>{t("products.pricePerUnit")}</Text>
                </View>
              </View>
            </View>
          </StaggerItem>

          {/* Details */}
          <StaggerItem index={2}>
            <View style={styles.metaCard}>
              <Text style={styles.metaTitle}>{t("products.productDetails")}</Text>
              <View style={styles.metaRow}>
                <Feather name="hash" size={15} color={palette.textTertiary} />
                <Text style={styles.metaLabel}>{t("products.productId")}</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {String(id)}
                </Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <Feather name="user" size={15} color={palette.textTertiary} />
                <Text style={styles.metaLabel}>{t("products.owner")}</Text>
                <Text style={styles.metaValue}>
                  {product?.user?.name || user?.name || t("products.you")}
                </Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <Feather name="layers" size={15} color={palette.textTertiary} />
                <Text style={styles.metaLabel}>{t("products.totalValue")}</Text>
                <Text style={styles.metaValue}>
                  ₹{" "}
                  {(
                    (product?.currentStock ?? 0) * (user?.priceAllotted ?? 0)
                  ).toLocaleString()}
                </Text>
              </View>
            </View>
          </StaggerItem>

          {/* Actions */}
          <StaggerItem index={3}>
            <View style={styles.actionsRow}>
              <PressableScale
                hapticFeedback
                onPress={() => setEditSheet(true)}
                style={styles.editAction}
              >
                <Feather name="edit-2" size={16} color={palette.primaryBright} />
                <Text style={styles.editActionText}>{t("products.editProduct")}</Text>
              </PressableScale>

              <PressableScale
                hapticFeedback
                onPress={() => setDeleteDialog(true)}
                style={styles.deleteAction}
              >
                <Feather name="trash-2" size={16} color={palette.danger} />
                <Text style={styles.deleteActionText}>{t("common.delete")}</Text>
              </PressableScale>
            </View>
          </StaggerItem>
        </View>
      </ScrollView>

      {/* Edit sheet (shared with Products screen) */}
      <ProductFormSheet
        open={editSheet}
        onOpenChange={setEditSheet}
        product={product}
        onSaved={() => router.back()}
      />

      {/* Delete confirm */}
      <AppDialog
        visible={deleteDialog}
        title={t("products.deleteProduct")}
        message={t("products.deleteConfirm", { name: product?.name ?? "" })}
        kind="danger"
        icon="trash-2"
        buttons={[
          {
            label: t("common.cancel"),
            style: "cancel",
            onPress: () => setDeleteDialog(false),
          },
          { label: t("common.delete"), style: "danger", onPress: performDelete },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.lg },
  heroCard: {
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadow(4),
  },
  heroImage: { width: "100%", height: 260 },
  skuBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  skuText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  detailCard: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  brand: {
    color: palette.primaryBright,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  productName: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  stockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: `${palette.success}40`,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  stockPillLow: {
    backgroundColor: "rgba(245, 166, 35, 0.12)",
    borderColor: `${palette.warning}40`,
  },
  stockPillText: { color: palette.success, fontSize: 11, fontWeight: "700" },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: spacing.lg,
  },
  statsRow: { flexDirection: "row", gap: spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statLabel: { color: palette.textSecondary, fontSize: 11 },
  metaCard: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  metaTitle: {
    color: palette.textTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 8,
  },
  metaLabel: { color: palette.textSecondary, fontSize: 13, flex: 1 },
  metaValue: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "600",
    flex: 1.4,
    textAlign: "right",
  },
  metaDivider: { height: 1, backgroundColor: palette.border },
  actionsRow: { flexDirection: "row", gap: spacing.md },
  editAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 15,
    borderRadius: radius.md,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: `${palette.primary}33`,
  },
  editActionText: {
    color: palette.primaryBright,
    fontWeight: "700",
    fontSize: 14,
  },
  deleteAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
    borderRadius: radius.md,
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    borderWidth: 1,
    borderColor: `${palette.danger}40`,
  },
  deleteActionText: { color: palette.danger, fontWeight: "700", fontSize: 14 },
});
