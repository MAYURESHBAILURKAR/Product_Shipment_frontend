import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Image as RNImage } from "react-native";
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
import { useTheme } from "../src/context/ThemeContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function EditShipmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { Colors } = useTheme();
  const { shipmentId } = useLocalSearchParams();

  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 1. Fetch User Products
      const prodRes = await axios.get(`${API_URL}/products/myproducts`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setProducts(prodRes.data);

      // 2. Fetch Existing Shipment
      const shipRes = await axios.get(`${API_URL}/shipments/myshipments`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const currentShipment = shipRes.data.find(
        (s: any) => s._id === shipmentId,
      );

      if (currentShipment) {
        const initialCart: any = {};
        currentShipment.items.forEach((item: any) => {
          // Handle population vs raw ID
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

  const updateQuantity = (productId: string, change: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      let newQty;

      // Step logic: If empty, start at 1000. Else +/- 500
      if (current === 0 && change > 0) newQty = 1000;
      else newQty = current + change * 500;

      if (newQty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => {
        // Sort selected items to top
        const qtyA = cart[a._id] || 0;
        const qtyB = cart[b._id] || 0;
        if (qtyA > 0 && qtyB === 0) return -1;
        if (qtyA === 0 && qtyB > 0) return 1;
        return 0;
      });
  }, [products, searchQuery, cart]);

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const estimatedPayout = totalItems * (user?.priceAllotted || 0);

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

  const renderProduct = ({ item }: any) => {
    const qty = cart[item._id] || 0;
    const isSelected = qty > 0;

    return (
      <Card
        backgroundColor={isSelected ? `${Colors.primary}10` : Colors.card} // 10% opacity if selected
        borderColor={isSelected ? Colors.primary : Colors.cardBorder}
        borderWidth={isSelected ? 1.5 : 1}
        padding="$0"
        marginBottom="$3"
        borderRadius="$4"
        overflow="hidden"
      >
        <XStack alignItems="center">
          {/* Image */}
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

          {/* Content */}
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
              <Text color={Colors.accent} fontWeight="bold">
                ₹ {user?.priceAllotted}
              </Text>
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

              {/* Stepper */}
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
        {/* Header */}
        <XStack alignItems="center" gap="$3" marginBottom="$4">
          <Button
            icon={<Feather name="arrow-left" size={24} color="white" />}
            chromeless
            onPress={() => router.back()}
            padding="$0"
          />
          <YStack>
            <Text
              color={Colors.textGray}
              fontSize={10}
              letterSpacing={1}
              fontWeight="bold"
            >
              EDIT MODE
            </Text>
            <H3 color="white" fontWeight="bold">
              Update Shipment
            </H3>
          </YStack>
        </XStack>

        {/* Search */}
        <XStack
          backgroundColor={Colors.card}
          borderRadius="$4"
          height={45}
          alignItems="center"
          paddingHorizontal="$3"
          marginBottom="$4"
          borderColor={Colors.cardBorder}
          borderWidth={1}
        >
          <Feather name="search" size={20} color={Colors.textGray} />
          <Input
            flex={1}
            backgroundColor="transparent"
            borderWidth={0}
            placeholder="Search products..."
            placeholderTextColor="$gray10"
            color="white"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
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
          />
        )}

        {/* Footer */}
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
            marginBottom="$4"
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

          <Button
            backgroundColor={Colors.primary}
            height={50}
            borderRadius="$4"
            onPress={handleUpdate}
            disabled={submitting || totalItems === 0}
            iconAfter={
              !submitting ? (
                <Feather name="check" size={20} color="white" />
              ) : undefined
            }
            pressStyle={{ opacity: 0.8 }}
          >
            {submitting ? (
              <Spinner color="white" />
            ) : (
              <Text color="white" fontWeight="bold" fontSize={16}>
                Confirm Changes
              </Text>
            )}
          </Button>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
