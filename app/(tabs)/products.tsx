import { Feather } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image as RNImage,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Input,
  Sheet,
  Text as TText,
} from "tamagui";
import {
  EmptyState,
  PressableScale,
  PrimaryButton,
  StaggerItem,
} from "../../src/components/ui";
import { palette, radius, shadow, spacing } from "../../src/theme/tokens";
import { useAuth } from "../../src/context/AuthContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/products`;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2; // 2 columns with padding + gap

export default function ProductsScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sheet State
  const [openSheet, setOpenSheet] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Form State
  const [newName, setNewName] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newImage, setNewImage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  // --- Fetch logic preserved exactly ---
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/myproducts`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p: any) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [products, searchQuery]);

  // --- Image/form logic preserved exactly ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setNewImage(result.assets[0]);
  };

  const openCreateMode = () => {
    setEditingProduct(null);
    setNewName("");
    setNewBrand("");
    setNewImage(null);
    setOpenSheet(true);
  };

  const openEditMode = (product: any) => {
    setEditingProduct(product);
    setNewName(product.name);
    setNewBrand(product.brand);
    setNewImage({ uri: product.photoUrl });
    setOpenSheet(true);
  };

  const handleSaveProduct = async () => {
    if (!newName || !newBrand) {
      Alert.alert("Error", "Name and Brand required");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("name", newName);
    formData.append("brand", newBrand);

    if (newImage && !newImage.uri.includes("cloudinary")) {
      // @ts-ignore
      formData.append("image", {
        uri: newImage.uri,
        type: "image/jpeg",
        name: "product.jpg",
      });
    }

    try {
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${user?.token}`,
        },
      };
      if (editingProduct)
        await axios.put(`${API_URL}/${editingProduct._id}`, formData, config);
      else await axios.post(API_URL, formData, config);
      setOpenSheet(false);
      fetchProducts();
    } catch (error) {
      Alert.alert("Error", "Operation failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    const performDelete = async () => {
      try {
        await axios.delete(`${API_URL}/${id}`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        fetchProducts();
      } catch (e) {
        Alert.alert("Error", "Could not delete");
      }
    };
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: performDelete },
    ]);
  };

  // --- Grid card ---
  const renderProduct = ({ item, index }: any) => {
    const isLowStock = item.currentStock < 100; // Example threshold

    return (
      <StaggerItem index={index % 8} travelY={10} style={{ width: CARD_WIDTH }}>
        <PressableScale
          onPress={() => openEditMode(item)}
          hapticFeedback
          style={styles.card}
        >
          {/* Image */}
          <View style={styles.imageWrap}>
            <RNImage
              source={{ uri: item.photoUrl || "https://placehold.co/100" }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
            <View style={styles.skuBadge}>
              <Text style={styles.skuText}>
                SKU-{item._id.slice(-3).toUpperCase()}
              </Text>
            </View>
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockText}>Low Stock</Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.cardBody}>
            <Text style={styles.brand}>{item.brand}</Text>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={styles.stockLabel}>
                Stock:{" "}
                <Text style={[styles.stockValue, isLowStock && { color: palette.warning }]}>
                  {item.currentStock}
                </Text>
              </Text>
              <View style={styles.quickActions}>
                <PressableScale
                  onPress={() => openEditMode(item)}
                  style={styles.actionIcon}
                >
                  <Feather name="edit-2" size={14} color={palette.textSecondary} />
                </PressableScale>
                <PressableScale
                  onPress={() => handleDelete(item._id)}
                  style={styles.actionIcon}
                >
                  <Feather name="trash-2" size={14} color={palette.danger} />
                </PressableScale>
              </View>
            </View>
          </View>
        </PressableScale>
      </StaggerItem>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={styles.flex}>
        {/* Header with Search */}
        <StaggerItem index={0} style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.heading}>My Products</Text>
            <PressableScale style={styles.bellBtn}>
              <Feather name="bell" size={20} color={palette.text} />
            </PressableScale>
          </View>

          {/* Search Bar */}
          <View style={styles.searchWrap}>
            <Feather name="search" size={17} color={palette.textTertiary} />
            <Input
              flex={1}
              backgroundColor="transparent"
              borderWidth={0}
              placeholder="Search SKU, Name, or Brand..."
              placeholderTextColor="$gray10"
              color={palette.text}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </StaggerItem>

        {loading && products.length === 0 ? (
          <View style={styles.gridSkeleton}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonImage} />
                <View style={styles.skeletonBody}>
                  <View style={[styles.skeletonBar, { width: "40%" }]} />
                  <View style={[styles.skeletonBar, { width: "80%", height: 12 }]} />
                  <View style={[styles.skeletonBar, { width: "50%", height: 10 }]} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item: any) => item._id}
            renderItem={renderProduct}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchProducts();
                }}
                tintColor={palette.primary}
                colors={[palette.primary]}
              />
            }
            contentContainerStyle={{ paddingBottom: 110 }}
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  icon="package"
                  title="No products found"
                  message={
                    searchQuery
                      ? "No products match your search."
                      : "Add your first product to start tracking inventory."
                  }
                  actionLabel="Add Product"
                  onAction={openCreateMode}
                />
              ) : null
            }
          />
        )}

        {/* FAB */}
        <PressableScale onPress={openCreateMode} hapticFeedback style={styles.fab}>
          <Feather name="plus" size={30} color="#FFFFFF" />
        </PressableScale>

        {/* Add/Edit Sheet */}
        <Sheet
          modal
          open={openSheet}
          onOpenChange={setOpenSheet}
          snapPoints={[80]}
          dismissOnSnapToBottom
        >
          <Sheet.Overlay />
          <Sheet.Frame padding="$4" gap="$4" backgroundColor={palette.surfaceElevated}>
            <Sheet.Handle />
            <TText color={palette.text} fontSize={20} fontWeight="700" textAlign="center">
              {editingProduct ? "Edit Product" : "New Product"}
            </TText>

            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <PressableScale onPress={pickImage} hapticFeedback>
                <View style={styles.imagePicker}>
                  {newImage ? (
                    <RNImage
                      source={{ uri: newImage.uri }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <Feather name="camera" size={28} color={palette.textTertiary} />
                  )}
                </View>
                <Text style={styles.changeImage}>Change Image</Text>
              </PressableScale>
            </View>

            <Input
              placeholder="Product Name"
              value={newName}
              onChangeText={setNewName}
              backgroundColor={palette.surfaceHighest}
              color={palette.text}
              placeholderTextColor="$gray10"
              borderColor={palette.border}
            />
            <Input
              placeholder="Brand"
              value={newBrand}
              onChangeText={setNewBrand}
              backgroundColor={palette.surfaceHighest}
              color={palette.text}
              placeholderTextColor="$gray10"
              borderColor={palette.border}
            />

            <PrimaryButton
              label={editingProduct ? "Update Product" : "Create Product"}
              loading={uploading}
              onPress={handleSaveProduct}
            />
          </Sheet.Frame>
        </Sheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heading: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.md,
    height: 45,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  card: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: 12,
  },
  imageWrap: { height: 130, width: "100%", backgroundColor: palette.surface },
  skuBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skuText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
  lowStockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: palette.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lowStockText: { color: "#000000", fontSize: 9, fontWeight: "700" },
  cardBody: { padding: spacing.md, gap: 4 },
  brand: {
    color: palette.primaryBright,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  productName: {
    color: palette.text,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 18,
    height: 36,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  stockLabel: { color: palette.textSecondary, fontSize: 11 },
  stockValue: { color: palette.text, fontWeight: "700" },
  quickActions: { flexDirection: "row", gap: 8 },
  actionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: palette.surfaceHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  gridSkeleton: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  skeletonCard: {
    width: CARD_WIDTH,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    overflow: "hidden",
    marginBottom: 12,
  },
  skeletonImage: {
    height: 130,
    backgroundColor: palette.surfaceElevated,
  },
  skeletonBody: { padding: spacing.md, gap: 8 },
  skeletonBar: {
    height: 11,
    borderRadius: 6,
    backgroundColor: palette.surfaceElevated,
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
  imagePicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.surfaceHighest,
    justifyContent: "center",
    alignItems: "center",
    borderColor: palette.border,
    borderWidth: 1,
    overflow: "hidden",
  },
  changeImage: {
    color: palette.primaryBright,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
  },
});
