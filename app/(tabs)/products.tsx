import { Feather } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  Image as RNImage,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H3,
  Input,
  Sheet,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useAuth } from "../../src/context/AuthContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/products`;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH / 2 - 24; // 2 columns with padding

// Nexus Colors
const Colors = {
  background: "#0B0E14",
  card: "#151A23",
  cardBorder: "#232936",
  primary: "#2F80ED",
  textGray: "#9CA3AF",
  success: "#00C851",
  warning: "#FFBB33",
  danger: "#FF4444",
  accent: "#4CC9F0",
};

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

  // ... (Keep existing pickImage, openCreateMode, openEditMode logic) ...
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

  // --- RENDER CARD (GRID STYLE) ---
  const renderProduct = ({ item }: any) => {
    const isLowStock = item.currentStock < 100; // Example threshold

    return (
      <Card
        width={CARD_WIDTH}
        backgroundColor={Colors.card}
        borderColor={Colors.cardBorder}
        borderWidth={1}
        borderRadius="$4"
        overflow="hidden"
        marginBottom="$3"
        marginRight="$3" // Spacing for grid
        padding="$0"
        pressStyle={{ scale: 0.98 }}
      >
        {/* Image Section */}
        <YStack height={140} width="100%">
          <RNImage
            source={{ uri: item.photoUrl || "https://placehold.co/100" }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />

          {/* Badges */}
          <YStack
            position="absolute"
            top={8}
            left={8}
            backgroundColor="rgba(0,0,0,0.6)"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text color="white" fontSize={10} fontWeight="bold">
              SKU-{item._id.slice(-3).toUpperCase()}
            </Text>
          </YStack>

          {isLowStock && (
            <YStack
              position="absolute"
              top={8}
              right={8}
              backgroundColor={Colors.warning}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text color="black" fontSize={10} fontWeight="bold">
                Low Stock
              </Text>
            </YStack>
          )}
        </YStack>

        {/* Content Section */}
        <YStack padding="$3" gap="$1">
          <Text color={Colors.primary} fontSize={12} fontWeight="bold">
            {item.brand}
          </Text>
          <Text
            color="white"
            fontSize={14}
            fontWeight="bold"
            numberOfLines={2}
            height={40}
          >
            {item.name}
          </Text>

          <XStack
            justifyContent="space-between"
            alignItems="center"
            marginTop="$2"
          >
            <Text color={Colors.textGray} fontSize={12}>
              Stock: <Text color="white">{item.currentStock}</Text>
            </Text>

            {/* Quick Actions */}
            <XStack gap="$2">
              <TouchableOpacity onPress={() => openEditMode(item)}>
                <Feather name="edit-2" size={16} color={Colors.textGray} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item._id)}>
                <Feather name="trash-2" size={16} color={Colors.danger} />
              </TouchableOpacity>
            </XStack>
          </XStack>
        </YStack>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <YStack flex={1} paddingHorizontal="$4" paddingTop="$2">
        {/* Header with Search */}
        <YStack gap="$4" marginBottom="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <H3 color="white" fontWeight="bold">
              My Products
            </H3>
            <TouchableOpacity>
              <Feather name="bell" size={24} color="white" />
            </TouchableOpacity>
          </XStack>

          {/* Modern Search Bar */}
          <XStack
            backgroundColor="white"
            borderRadius="$4"
            height={45}
            alignItems="center"
            paddingHorizontal="$3"
          >
            <Feather name="search" size={20} color="#666" />
            <Input
              flex={1}
              backgroundColor="transparent"
              borderWidth={0}
              placeholder="Search SKU, Name, or Brand..."
              placeholderTextColor="$gray10"
              color="black"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {/* <Feather name="sliders" size={18} color={Colors.primary} /> */}
          </XStack>

          {/* Filter Tabs (Mock) */}
          <XStack gap="$2">
            {["All Items"].map((tab, i) => (
              <Button
                key={tab}
                size="$3"
                backgroundColor={i === 0 ? Colors.primary : Colors.card}
                borderRadius="$10"
                pressStyle={{ opacity: 0.8 }}
              >
                <Text color="white" fontSize={12} fontWeight="600">
                  {tab}
                </Text>
              </Button>
            ))}
          </XStack>
        </YStack>

        {loading ? (
          <Spinner size="large" color={Colors.primary} marginTop="$10" />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item: any) => item._id}
            renderItem={renderProduct}
            numColumns={2} // ✅ Grid Layout
            columnWrapperStyle={{ justifyContent: "space-between" }} // Spacing between columns
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchProducts();
                }}
                tintColor={Colors.primary}
              />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        {/* FAB (Floating Action Button) */}
        <Button
          position="absolute"
          bottom={90}
          right={20}
          size="$6"
          circular
          backgroundColor={Colors.primary}
          elevation={10}
          pressStyle={{ scale: 0.95 }}
          onPress={openCreateMode}
          icon={<Feather name="plus" size={32} color="white" />}
        />

        {/* Add/Edit Sheet */}
        <Sheet
          modal
          open={openSheet}
          onOpenChange={setOpenSheet}
          snapPoints={[80]}
          dismissOnSnapToBottom
        >
          <Sheet.Overlay />
          <Sheet.Frame padding="$4" gap="$4" backgroundColor={Colors.card}>
            <Sheet.Handle />
            <H3 color="white" textAlign="center">
              {editingProduct ? "Edit Product" : "New Product"}
            </H3>

            <YStack alignItems="center" marginBottom="$2">
              <TouchableOpacity onPress={pickImage}>
                <YStack
                  width={100}
                  height={100}
                  borderRadius={50}
                  backgroundColor={Colors.background}
                  justifyContent="center"
                  alignItems="center"
                  borderColor={Colors.cardBorder}
                  borderWidth={1}
                  overflow="hidden"
                >
                  {newImage ? (
                    <RNImage
                      source={{ uri: newImage.uri }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <Feather name="camera" size={30} color={Colors.textGray} />
                  )}
                </YStack>
                <Text
                  color={Colors.primary}
                  fontSize={12}
                  marginTop="$2"
                  textAlign="center"
                >
                  Change Image
                </Text>
              </TouchableOpacity>
            </YStack>

            <Input
              placeholder="Product Name"
              value={newName}
              onChangeText={setNewName}
              backgroundColor={Colors.background}
              color="white"
              placeholderTextColor="$gray10"
              borderColor={Colors.cardBorder}
            />
            <Input
              placeholder="Brand"
              value={newBrand}
              onChangeText={setNewBrand}
              backgroundColor={Colors.background}
              color="white"
              placeholderTextColor="$gray10"
              borderColor={Colors.cardBorder}
            />

            <Button
              backgroundColor={Colors.primary}
              onPress={handleSaveProduct}
              disabled={uploading}
              icon={uploading ? <Spinner color="white" /> : undefined}
            >
              <Text color="white" fontWeight="bold">
                {editingProduct ? "Update Product" : "Create Product"}
              </Text>
            </Button>
          </Sheet.Frame>
        </Sheet>
      </YStack>
    </SafeAreaView>
  );
}
