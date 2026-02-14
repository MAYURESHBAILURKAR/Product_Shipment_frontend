import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Linking, Image as RNImage } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H3,
  Input,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useAuth } from "../src/context/AuthContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const ADMIN_PHONE = process.env.EXPO_PUBLIC_ADMIN_PHONE;

// Nexus Colors
const Colors = {
  background: "#0B0E14",
  card: "#151A23",
  cardSelected: "#1A273A",
  cardBorder: "#232936",
  primary: "#2F80ED",
  textGray: "#9CA3AF",
  success: "#00C851",
  accent: "#4CC9F0",
  danger: "#FF4444",
};

export default function NewShipmentScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

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

      // If A is selected and B is not, A goes first (-1)
      if (qtyA > 0 && qtyB === 0) return -1;
      // If B is selected and A is not, B goes first (1)
      if (qtyA === 0 && qtyB > 0) return 1;
      // Otherwise keep original order
      return 0;
    });
  }, [products, searchQuery, showSelectedOnly, cart]);

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

  const handleSubmit = async () => {
    if (totalItems === 0) {
      Alert.alert("Error", "Please add at least one item.");
      return;
    }
    setSubmitting(true);
    const itemsPayload = Object.keys(cart).map((productId) => ({
      productId,
      quantity: cart[productId],
    }));

    try {
      await axios.post(
        `${API_URL}/shipments`,
        { items: itemsPayload },
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );

      const itemsList = Object.keys(cart)
        .map((id) => {
          const product = products.find((p) => p._id === id);
          const qty = cart[id];
          const itemValue = qty * (user?.priceAllotted || 0);
          return `• ${product?.name || "Unknown"}: ${qty} pcs (₹${itemValue})`;
        })
        .join("\n");

      const message = `📦 *New Shipment Sent!*

👤 *Owner:* ${user?.name}
📊 *Total Items:* ${totalItems}
💰 *Total Value:* ₹${estimatedPayout.toFixed(2)}

📝 *Shipment Details:*
${itemsList}

Please approve this in the Admin App.`;
      Alert.alert("Shipment Recorded!", "Notify Admin via WhatsApp?", [
        { text: "No", onPress: () => router.back(), style: "cancel" },
        {
          text: "Notify via WhatsApp",
          onPress: () => {
            const url = `whatsapp://send?phone=${ADMIN_PHONE}&text=${encodeURIComponent(message)}`;
            Linking.canOpenURL(url).then((supported) => {
              if (supported) Linking.openURL(url);
              else
                Linking.openURL(
                  `sms:${ADMIN_PHONE}?body=${encodeURIComponent(message)}`,
                );
            });
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to send shipment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderProduct = ({ item }: any) => {
    const qty = cart[item._id] || 0;
    const isSelected = qty > 0;

    return (
      <Card
        backgroundColor={isSelected ? Colors.cardSelected : Colors.card}
        borderColor={isSelected ? Colors.primary : Colors.cardBorder}
        borderWidth={isSelected ? 2 : 1}
        padding="$0"
        marginBottom="$3"
        borderRadius="$4"
        overflow="hidden"
        animation="bouncy"
      >
        <XStack alignItems="center">
          {/* Image Section */}
          <YStack width={80} height={90} backgroundColor="#000">
            <RNImage
              source={{ uri: item.photoUrl || "https://placehold.co/100" }}
              style={{
                width: "100%",
                height: "100%",
                opacity: isSelected ? 1 : 0.7,
              }}
            />
            {isSelected && (
              <YStack
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                backgroundColor="rgba(47, 128, 237, 0.3)"
                justifyContent="center"
                alignItems="center"
              >
                <Feather name="check-circle" size={24} color="white" />
              </YStack>
            )}
          </YStack>

          {/* Content Section */}
          <YStack flex={1} padding="$3" justifyContent="space-between">
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack>
                <Text color="white" fontWeight="bold" fontSize={14}>
                  {item.name}
                </Text>
                <Text color={Colors.textGray} fontSize={12}>
                  SKU: {item._id.slice(-4).toUpperCase()}
                </Text>
              </YStack>
              <YStack alignItems="flex-end">
                <Text color={Colors.accent} fontWeight="bold">
                  ₹ {user?.priceAllotted}
                </Text>
              </YStack>
            </XStack>

            <XStack
              justifyContent="space-between"
              alignItems="center"
              marginTop="$2"
            >
              <Text
                color={
                  item.currentStock < 500 ? Colors.danger : Colors.textGray
                }
                fontSize={11}
              >
                Stock: {item.currentStock}
              </Text>

              <XStack
                alignItems="center"
                gap="$3"
                backgroundColor={
                  isSelected ? Colors.primary : Colors.background
                }
                borderRadius="$4"
                paddingVertical={4}
                paddingHorizontal={6}
                borderColor={isSelected ? Colors.primary : Colors.cardBorder}
                borderWidth={1}
              >
                <Button
                  size="$2"
                  circular
                  chromeless
                  onPress={() => updateQuantity(item._id, -1)}
                  icon={<Feather name="minus" size={14} color="white" />}
                />
                <Text
                  color="white"
                  fontWeight="bold"
                  fontSize={14}
                  width={30}
                  textAlign="center"
                >
                  {qty}
                </Text>
                <Button
                  size="$2"
                  circular
                  chromeless
                  onPress={() => updateQuantity(item._id, 1)}
                  icon={<Feather name="plus" size={14} color="white" />}
                />
              </XStack>
            </XStack>
          </YStack>
        </XStack>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <YStack flex={1} paddingHorizontal="$4" paddingTop="$2">
        {/* Header Section */}
        <XStack alignItems="center" gap="$3" marginBottom="$2">
          <Button
            icon={<Feather name="arrow-left" size={24} color="white" />}
            chromeless
            onPress={() => router.back()}
          />
          <YStack>
            <H3 color="white" fontWeight="bold">
              Select Products
            </H3>
          </YStack>
        </XStack>

        {/* Search Bar + Filter Toggle */}
        <XStack gap="$2" marginBottom="$4">
          <XStack
            flex={1}
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
              placeholder="Search products..."
              placeholderTextColor="$gray10"
              color="black"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </XStack>

          {/* ✅ FIXED ICON ALIGNMENT */}
          <Button
            backgroundColor={showSelectedOnly ? Colors.primary : Colors.card}
            borderColor={showSelectedOnly ? Colors.primary : Colors.cardBorder}
            borderWidth={1}
            width={45}
            height={45}
            borderRadius="$4"
            onPress={() => setShowSelectedOnly(!showSelectedOnly)}
            padding="$0"
            justifyContent="center"
            alignItems="center"
            // Using the icon prop ensures it's perfectly centered
            icon={
              <Feather
                name="shopping-cart"
                size={20}
                color={showSelectedOnly ? "white" : Colors.textGray}
              />
            }
          />
        </XStack>

        <XStack justifyContent="space-between" marginBottom="$3">
          <Text color={Colors.textGray} fontSize={12} letterSpacing={1}>
            {showSelectedOnly ? "SELECTED ITEMS" : "AVAILABLE ITEMS"}
          </Text>
          {totalItems > 0 && (
            <Text color={Colors.accent} fontSize={12} fontWeight="bold">
              {Object.keys(cart).filter((k) => cart[k] > 0).length} Product(s)
              Selected
            </Text>
          )}
        </XStack>

        {loading ? (
          <Spinner size="large" color={Colors.primary} marginTop="$10" />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProduct}
            contentContainerStyle={{ paddingBottom: 180 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text color={Colors.textGray} textAlign="center" marginTop="$10">
                {showSelectedOnly
                  ? "No items selected yet."
                  : "No products found."}
              </Text>
            }
          />
        )}

        {/* Live Budget Footer */}
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          backgroundColor={Colors.card}
          padding="$4"
          borderTopColor={Colors.cardBorder}
          borderTopWidth={1}
        >
          <XStack
            justifyContent="space-between"
            alignItems="flex-end"
            marginBottom="$2"
          >
            <YStack>
              <Text color={Colors.textGray} fontSize={11}>
                ESTIMATED PAYOUT
              </Text>
              <H3 color="white">₹ {estimatedPayout.toFixed(2)}</H3>
            </YStack>
            <YStack alignItems="flex-end">
              <Text color={Colors.textGray} fontSize={11}>
                TOTAL ITEMS
              </Text>
              <Text color="white" fontWeight="bold" fontSize={16}>
                {totalItems}
              </Text>
            </YStack>
          </XStack>

          <YStack
            height={6}
            backgroundColor={Colors.background}
            borderRadius={3}
            marginBottom="$4"
            overflow="hidden"
          >
            <YStack
              height="100%"
              width={`${progressPercent}%`}
              backgroundColor={Colors.primary}
            />
          </YStack>

          <Button
            backgroundColor={Colors.primary}
            height={50}
            borderRadius="$4"
            onPress={handleSubmit}
            disabled={submitting || totalItems === 0}
            iconAfter={
              !submitting ? (
                <Feather name="arrow-right" size={20} color="white" />
              ) : undefined
            }
            pressStyle={{ opacity: 0.8 }}
          >
            {submitting ? (
              <Spinner color="white" />
            ) : (
              <Text color="white" fontWeight="bold" fontSize={16}>
                Confirm & Send
              </Text>
            )}
          </Button>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
