import { Feather } from "@expo/vector-icons";
import axios from "axios";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image as RNImage,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import { Input } from "tamagui";
import {
  EmptyState,
  PressableScale,
  PrimaryButton,
  ScreenHeader,
  SkeletonListRow,
  StaggerItem,
  useToast,
} from "../src/components/ui";
import { palette, radius, spacing } from "../src/theme/tokens";
import { useAuth } from "../src/context/AuthContext";
import { useLanguage } from "../src/i18n/LanguageProvider";
import { getErrorMessage } from "../src/utils/errors";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL;
// Currently unused now that sharing goes through Copy Details + Share Image,
// kept in case you want to add a direct WhatsApp deep-link back in later.
const ADMIN_PHONE = process.env.EXPO_PUBLIC_ADMIN_PHONE;

export default function NewShipmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Preview / share modal state
  const [previewVisible, setPreviewVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  // --- Fetch logic preserved exactly ---
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/products/myproducts`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Filter/sort logic preserved exactly ---
  const filteredProducts = useMemo(() => {
    // 1. Filter
    const filtered = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
      const isSelected = (cart[p._id] || 0) > 0;
      const matchesToggle = showSelectedOnly ? isSelected : true;
      return matchesSearch && matchesToggle;
    });

    // 2. Sort (Selected items first)
    return filtered.sort((a, b) => {
      const qtyA = cart[a._id] || 0;
      const qtyB = cart[b._id] || 0;

      if (qtyA > 0 && qtyB === 0) return -1;
      if (qtyA === 0 && qtyB > 0) return 1;
      return 0;
    });
  }, [products, searchQuery, showSelectedOnly, cart]);

  // --- Stepper logic preserved exactly (1000 start, ±500 steps) ---
  const updateQuantity = (productId: string, change: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      let newQty;

      if (current === 0 && change > 0) newQty = 1000;
      else newQty = current + change * 500;

      if (newQty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const estimatedPayout = totalItems * (user?.priceAllotted || 0);
  const progressPercent = Math.min((totalItems / 5000) * 100, 100);

  // Springy footer progress bar (lives OUTSIDE the ViewShot capture area)
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(Math.min(progressPercent / 100, 1), {
      damping: 18,
      stiffness: 130,
    });
  }, [progressPercent]);
  const progressFillStyle = useAnimatedStyle(() => ({
    flex: Math.max(progress.value, 0.001),
  }));

  // Derived list of selected products with resolved product data
  const cartItems = useMemo(() => {
    return Object.keys(cart)
      .filter((id) => cart[id] > 0)
      .map((id) => {
        const product = products.find((p) => p._id === id);
        const qty = cart[id];
        return {
          product,
          qty,
          value: qty * (user?.priceAllotted || 0),
        };
      })
      .filter((entry) => entry.product); // drop any orphaned cart entries
  }, [cart, products, user?.priceAllotted]);

  // Original plain-text shipment summary (used for the text-based WhatsApp share)
  const buildTextMessage = () => {
    const itemsList = cartItems
      .map(({ product, qty, value }) => {
        return `• ${product?.brand || "Unknown"} - ${product?.name || "Unknown"}: ${qty} pcs (₹${value})`;
      })
      .join("\n");

    return `📦 *New Shipment Sent!*

👤 *Owner:* ${user?.name}
📊 *Total Items:* ${totalItems}
💰 *Total Value:* ₹${estimatedPayout.toFixed(2)}

📝 *Shipment Details:*
${itemsList}

Please approve this in the Admin App.`;
  };

  // --- Submit preserved exactly ---
  const handleSubmit = async () => {
    if (totalItems === 0) {
      showToast({ message: t("newShipment.addAtLeastOne"), kind: "error" });
      return;
    }
    setSubmitting(true);

    const itemsPayload = cartItems.map(({ product, qty }) => ({
      productId: product._id,
      quantity: qty,
    }));

    try {
      await axios.post(
        `${API_URL}/shipments`,
        { items: itemsPayload },
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );

      setSubmitting(false);
      // Instead of a plain text alert, open the visual receipt/preview
      setPreviewVisible(true);
    } catch (error: any) {
      setSubmitting(false);
      showToast({
        message: getErrorMessage(error, t, "newShipment.failedToSend"),
        kind: "error",
      });
    }
  };

  // Generic share: sends just the rendered image via the native share sheet,
  // letting the user pick any app/contact themselves.
  const handleShareImage = async () => {
    try {
      setSharing(true);

      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error("Could not capture shipment image");

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast({
          message: t("newShipment.shareUnavailable"),
          kind: "error",
        });
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: t("newShipment.shareImage"),
        UTI: "public.png",
      });
    } catch (err) {
      console.error(err);
      showToast({
        message: t("newShipment.shareFailed"),
        kind: "error",
      });
    } finally {
      setSharing(false);
      setPreviewVisible(false);
      router.back();
    }
  };

  // Copies the original text-format shipment summary to the clipboard.
  // The idea: copy this first, then hit "Share Image" and paste the text as
  // the caption wherever you send the photo (WhatsApp, etc). Avoids the
  // whatsapp:// deep link limitation of only carrying text, no image.
  const handleCopyDetails = async () => {
    try {
      const message = buildTextMessage();
      await Clipboard.setStringAsync(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      showToast({ message: t("newShipment.copyFailed"), kind: "error" });
    }
  };

  const handleSkipShare = () => {
    setPreviewVisible(false);
    router.back();
  };

  const renderProduct = ({ item, index }: any) => {
    const qty = cart[item._id] || 0;
    const isSelected = qty > 0;

    return (
      <StaggerItem index={index % 8} travelY={10}>
        <View
          style={[
            styles.productCard,
            isSelected && styles.productCardSelected,
          ]}
        >
          <View style={styles.productRow}>
            {/* Image */}
            <View style={styles.productImageWrap}>
              <RNImage
                source={{ uri: item.photoUrl || "https://placehold.co/100" }}
                style={{
                  width: "100%",
                  height: "100%",
                  opacity: isSelected ? 1 : 0.7,
                }}
              />
              {isSelected && (
                <View style={styles.selectedOverlay}>
                  <Feather name="check-circle" size={24} color="white" />
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.productContent}>
              <View style={styles.productTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  {item.brand ? (
                    <Text style={styles.productBrand}>{item.brand}</Text>
                  ) : null}
                  <Text style={styles.productSku}>
                    SKU: {item._id.slice(-4).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.productPrice}>₹ {user?.priceAllotted}</Text>
              </View>

              <View style={styles.productBottom}>
                <Text
                  style={[
                    styles.stockText,
                    item.currentStock < 500 && { color: palette.danger },
                  ]}
                >
                  {t("newShipment.stockLabel")}{item.currentStock}
                </Text>

                {/* Stepper */}
                <View
                  style={[
                    styles.stepper,
                    isSelected && styles.stepperActive,
                  ]}
                >
                  <PressableScale
                    hapticFeedback
                    onPress={() => updateQuantity(item._id, -1)}
                    style={styles.stepBtn}
                  >
                    <Feather name="minus" size={14} color="#FFFFFF" />
                  </PressableScale>
                  <Text style={styles.qtyText}>{qty}</Text>
                  <PressableScale
                    hapticFeedback
                    onPress={() => updateQuantity(item._id, 1)}
                    style={styles.stepBtn}
                  >
                    <Feather name="plus" size={14} color="#FFFFFF" />
                  </PressableScale>
                </View>
              </View>
            </View>
          </View>
        </View>
      </StaggerItem>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={styles.flex}>
        {/* Header */}
        <View style={styles.headerPad}>
          <ScreenHeader
            title={t("newShipment.selectProducts")}
            subtitle={t("newShipment.newShipment")}
            onBack={() => router.back()}
          />
        </View>

        {/* Search Bar + Filter Toggle */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Feather name="search" size={17} color={palette.textTertiary} />
            <Input
              flex={1}
              backgroundColor="transparent"
              borderWidth={0}
              placeholder={t("newShipment.searchPlaceholder")}
              placeholderTextColor="$gray10"
              color={palette.text}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <PressableScale
            hapticFeedback
            onPress={() => setShowSelectedOnly(!showSelectedOnly)}
            style={[
              styles.filterBtn,
              showSelectedOnly && styles.filterBtnActive,
            ]}
          >
            <Feather
              name="shopping-cart"
              size={18}
              color={showSelectedOnly ? palette.primaryBright : palette.textTertiary}
            />
          </PressableScale>
        </View>

        <View style={styles.listMeta}>
          <Text style={styles.listMetaLabel}>
            {showSelectedOnly
              ? t("newShipment.selectedItems")
              : t("newShipment.availableItems")}
          </Text>
          {totalItems > 0 && (
            <Text style={styles.selectedCount}>
              {Object.keys(cart).filter((k) => cart[k] > 0).length}{" "}
              {t("newShipment.productsSelected")}
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonListRow key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProduct}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 200 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  icon="package"
                  title={
                    showSelectedOnly
                      ? t("newShipment.nothingSelected")
                      : t("products.noProducts")
                  }
                  message={
                    showSelectedOnly
                      ? t("newShipment.tapToAdd")
                      : t("newShipment.addProductsFirst")
                  }
                />
              ) : null
            }
          />
        )}

        {/* Live Budget Footer */}
        <View style={styles.footer}>
          <View style={styles.footerStats}>
            <View>
              <Text style={styles.footerLabel}>{t("newShipment.estimatedPayout")}</Text>
              <Text style={styles.footerPayout}>
                ₹ {estimatedPayout.toFixed(2)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.footerLabel}>{t("newShipment.totalItems")}</Text>
              <Text style={styles.footerItems}>{totalItems}</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, progressFillStyle]}
            />
          </View>

          <PrimaryButton
            label={t("newShipment.confirmSend")}
            icon="arrow-right"
            size="lg"
            loading={submitting}
            disabled={totalItems === 0}
            onPress={handleSubmit}
          />
        </View>
      </View>

      {/* Preview + Share Modal (rendered after submit succeeds) */}
      <Modal visible={previewVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          {/* ⚠️ ViewShot subtree must stay animation-free — capture reads
              rendered pixels; a mid-animation frame = blank/translucent image. */}
          <ViewShot
            ref={viewShotRef}
            options={{ format: "png", quality: 0.92 }}
            style={{ backgroundColor: palette.background }}
          >
            <View style={styles.receipt}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptTitle}>{t("newShipment.receiptTitle")}</Text>
                <Text style={styles.receiptSub}>{t("newShipment.owner")}{user?.name}</Text>
              </View>

              {cartItems.map(({ product, qty, value }) => (
                <View key={product._id} style={styles.receiptRow}>
                  <RNImage
                    source={{
                      uri: product.photoUrl || "https://placehold.co/100",
                    }}
                    style={styles.receiptThumb}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.receiptProductName}>
                      {product.brand} - {product.name}
                    </Text>
                    <Text style={styles.receiptProductMeta}>
                      {qty} {t("newShipment.pcs")} · ₹{value}
                    </Text>
                  </View>
                </View>
              ))}

              <View style={styles.receiptFooter}>
                <Text style={styles.receiptTotalLabel}>
                  {t("newShipment.total")}{totalItems} {t("newShipment.pcs")}
                </Text>
                <Text style={styles.receiptTotalValue}>
                  ₹ {estimatedPayout.toFixed(2)}
                </Text>
              </View>
            </View>
          </ViewShot>

          <View style={styles.modalActions}>
            <PressableScale
              hapticFeedback
              onPress={handleCopyDetails}
              style={[styles.copyBtn, copied && styles.copyBtnDone]}
            >
              <Feather
                name={copied ? "check" : "copy"}
                size={17}
                color={copied ? palette.success : palette.text}
              />
              <Text
                style={[
                  styles.copyBtnText,
                  copied && { color: palette.success },
                ]}
              >
                {copied ? t("newShipment.copied") : t("newShipment.copyDetails")}
              </Text>
            </PressableScale>

            <PrimaryButton
              label={t("newShipment.shareImage")}
              icon="image"
              loading={sharing}
              onPress={handleShareImage}
            />

            <Text style={styles.tipText}>
              {t("newShipment.shareTip")}
            </Text>

            <PressableScale
              hapticFeedback
              onPress={handleSkipShare}
              style={styles.skipBtn}
            >
              <Text style={styles.skipText}>{t("common.skip")}</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary,
  },
  listMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  listMetaLabel: {
    color: palette.textTertiary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  selectedCount: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  skeletonWrap: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  productCard: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  productCardSelected: {
    backgroundColor: `${palette.primary}12`,
    borderColor: palette.primary,
    borderWidth: 1.5,
  },
  productRow: { flexDirection: "row", alignItems: "center" },
  productImageWrap: {
    width: 80,
    height: 96,
    backgroundColor: palette.surface,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(47, 128, 237, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  productContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "space-between",
    minHeight: 96,
  },
  productTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  productName: { color: palette.text, fontWeight: "700", fontSize: 14 },
  productBrand: {
    color: palette.primaryBright,
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 2,
  },
  productSku: { color: palette.textSecondary, fontSize: 12, marginTop: 2 },
  productPrice: { color: palette.accent, fontWeight: "700", fontSize: 14 },
  productBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  stockText: { color: palette.textSecondary, fontSize: 11 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.background,
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderColor: palette.border,
    borderWidth: 1,
  },
  stepperActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    width: 34,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.surfaceElevated,
    padding: spacing.lg,
    borderTopColor: palette.border,
    borderTopWidth: 1,
  },
  footerStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.md,
  },
  footerLabel: {
    color: palette.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  footerPayout: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 3,
    letterSpacing: -0.3,
  },
  footerItems: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 16,
    marginTop: 3,
  },
  progressTrack: {
    height: 6,
    flexDirection: "row",
    backgroundColor: palette.surfaceHighest,
    borderRadius: 3,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: palette.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  receipt: {
    width: 340,
    backgroundColor: palette.background,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  receiptHeader: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  receiptTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  receiptSub: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.sm,
  },
  receiptThumb: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
  },
  receiptProductName: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  receiptProductMeta: {
    color: palette.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  receiptFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopColor: palette.border,
    borderTopWidth: 1,
  },
  receiptTotalLabel: { color: palette.textSecondary, fontSize: 13 },
  receiptTotalValue: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  modalActions: { gap: spacing.sm, marginTop: spacing.lg, width: 340 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
  },
  copyBtnDone: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: `${palette.success}55`,
  },
  copyBtnText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  tipText: {
    color: palette.textSecondary,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  skipBtn: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: { color: palette.textSecondary, fontSize: 14, fontWeight: "600" },
});
