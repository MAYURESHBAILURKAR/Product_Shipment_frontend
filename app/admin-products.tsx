import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Image as RNImage,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "tamagui";
import {
  EmptyState,
  ScreenHeader,
  SkeletonListRow,
  StaggerItem,
} from "../src/components/ui";
import { palette, radius, spacing } from "../src/theme/tokens";
import { useAuth } from "../src/context/AuthContext";
import { useLanguage } from "../src/i18n/LanguageProvider";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

export default function AdminProductsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // --- Fetch logic preserved exactly ---
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/products/admin/all`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, []),
  );

  // --- Filter preserved exactly ---
  const filteredProducts = products.filter(
    (p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.name.toLowerCase().includes(search.toLowerCase()),
  );

  const renderProduct = ({ item, index }: any) => (
    <StaggerItem index={index} travelY={10}>
      <View style={styles.card}>
        <RNImage
          source={{ uri: item.photoUrl || "https://via.placeholder.com/100" }}
          style={{ width: 100, height: "100%" }}
        />
        <View style={styles.cardBody}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productBrand}>{item.brand}</Text>

          {/* Owner */}
          <View style={styles.ownerRow}>
            <Feather name="user" size={13} color={palette.accent} />
            <Text style={styles.ownerText}>
              <Text style={styles.ownerName}>{item.user?.name}</Text>
              <Text style={styles.ownerLocality}>
                {" "}
                ({item.user?.locality || t("admin.noLocality")})
              </Text>
            </Text>
          </View>

          {/* Stock */}
          <View style={styles.stockRow}>
            <Feather name="box" size={13} color={palette.warning} />
            <Text style={styles.stockText}>
              {t("products.inStockCount", { count: item.currentStock })}
            </Text>
          </View>
        </View>
      </View>
    </StaggerItem>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={styles.flex}>
        <View style={styles.headerPad}>
          <ScreenHeader
            title={t("adminScreens.globalInventory")}
            subtitle={t("adminScreens.allProducts")}
            onBack={() => router.back()}
          />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={palette.textTertiary} />
          <Input
            flex={1}
            placeholder={t("adminScreens.searchPlaceholder")}
            value={search}
            onChangeText={setSearch}
            backgroundColor="transparent"
            borderWidth={0}
            color={palette.text}
            placeholderTextColor="$gray9"
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
            keyExtractor={(item: any) => item._id}
            renderItem={renderProduct}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  icon="package"
                  title={t("products.noProducts")}
                  message={
                    search
                      ? t("products.noProductsSearch")
                      : t("products.adminEmptyMessage")
                  }
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
  card: {
    flexDirection: "row",
    borderColor: palette.border,
    borderWidth: 1,
    marginBottom: spacing.md,
    backgroundColor: palette.surfaceElevated,
    overflow: "hidden",
    borderRadius: radius.lg,
  },
  cardBody: { padding: spacing.md, flex: 1, gap: 6 },
  productName: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  productBrand: { color: palette.textSecondary, fontSize: 12, marginBottom: 2 },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(76, 201, 240, 0.08)",
    padding: 8,
    borderRadius: radius.sm,
  },
  ownerText: { fontSize: 12, flex: 1 },
  ownerName: { color: palette.accent, fontWeight: "700" },
  ownerLocality: { color: palette.textSecondary, fontWeight: "400" },
  stockRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stockText: { color: palette.warning, fontWeight: "700", fontSize: 12 },
});
