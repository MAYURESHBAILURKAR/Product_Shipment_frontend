import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image as RNImage,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "tamagui";
import {
  PressableScale,
  PrimaryButton,
  ScreenHeader,
  SkeletonListRow,
  StaggerItem,
} from "../src/components/ui";
import { palette, radius, spacing } from "../src/theme/tokens";
import { useAuth } from "../src/context/AuthContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function EditShipmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { shipmentId } = useLocalSearchParams();

  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // --- Load logic preserved exactly ---
  const loadData = async () => {
    try {
      const prodRes = await axios.get(`${API_URL}/products/myproducts`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setProducts(prodRes.data);

      const shipRes = await axios.get(`${API_URL}/shipments/myshipments`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const currentShipment = shipRes.data.find(
        (s: any) => s._id === shipmentId,
      );

      if (currentShipment) {
        const initialCart: any = {};
        currentShipment.items.forEach((item: any) => {
          const pId =
            typeof item.product === "object" ? item.product._id : item.product;
          initialCart[pId] = item.quantity;
        });
        setCart(initialCart);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load shipment data");
      router.back();
    } finally {
      setLoading(false);
    }
  };

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

  // --- Filter/sort preserved exactly ---
  const filteredProducts = useMemo(() => {
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => {
        const qtyA = cart[a._id] || 0;
        const qtyB = cart[b._id] || 0;
        if (qtyA > 0 && qtyB === 0) return -1;
        if (qtyA === 0 && qtyB > 0) return 1;
        return 0;
      });
  }, [products, searchQuery, cart]);

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const estimatedPayout = totalItems * (user?.priceAllotted || 0);

  // --- Submit preserved exactly ---
  const handleUpdate = async () => {
    setSubmitting(true);
    const itemsPayload = Object.keys(cart).map((productId) => ({
      productId,
      quantity: cart[productId],
    }));

    try {
      await axios.put(
        `${API_URL}/shipments/${shipmentId}/edit`,
        { items: itemsPayload },
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );

      Alert.alert("Success", "Shipment Updated!");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
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
                  Stock: {item.currentStock}
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
            title="Update Shipment"
            subtitle="EDIT MODE"
            onBack={() => router.back()}
          />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={17} color={palette.textTertiary} />
          <Input
            flex={1}
            backgroundColor="transparent"
            borderWidth={0}
            placeholder="Search products..."
            placeholderTextColor="$gray10"
            color={palette.text}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
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
          />
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerStats}>
            <View>
              <Text style={styles.footerLabel}>ESTIMATED PAYOUT</Text>
              <Text style={styles.footerPayout}>
                ₹ {estimatedPayout.toFixed(2)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.footerLabel}>TOTAL ITEMS</Text>
              <Text style={styles.footerItems}>{totalItems}</Text>
            </View>
          </View>

          <PrimaryButton
            label="Confirm Changes"
            icon="check"
            size="lg"
            loading={submitting}
            disabled={totalItems === 0}
            onPress={handleUpdate}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
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
    marginBottom: spacing.lg,
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
});
