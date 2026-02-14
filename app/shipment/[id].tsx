import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Image as RNImage, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H3,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

export default function ShipmentDetailsScreen() {
  const { id } = useLocalSearchParams(); // Get the ID from the route
  const router = useRouter();
  const { user } = useAuth();
  const { Colors } = useTheme();

  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchShipmentDetails();
    }
  }, [id]);

  const fetchShipmentDetails = async () => {
    try {
      // ✅ CHANGED: Direct API call for a single shipment
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return Colors.success;
      case "rejected":
        return Colors.danger;
      default:
        return "#FFBB33";
    }
  };

  if (loading) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor={Colors.background}
      >
        <Spinner size="large" color={Colors.primary} />
      </YStack>
    );
  }

  if (!shipment) return null;

  const isPending = shipment.status === "pending";
  const statusColor = getStatusColor(shipment.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 1. Header */}
        <XStack
          paddingHorizontal="$4"
          paddingTop="$2"
          justifyContent="space-between"
          alignItems="center"
          marginBottom="$4"
        >
          <XStack gap="$2" alignItems="center">
            <Button
              icon={<Feather name="arrow-left" size={24} color="white" />}
              chromeless
              onPress={() => router.back()}
              padding="$0"
            />
            <H3 color="white" fontWeight="bold">
              Details
            </H3>
          </XStack>

          {/* Edit Button (Only if Pending) */}
          {isPending && (
            <Button
              size="$3"
              backgroundColor={Colors.card}
              borderColor={Colors.primary}
              borderWidth={1}
              icon={<Feather name="edit-2" size={16} color={Colors.primary} />}
              onPress={() =>
                router.push({
                  pathname: "/shipment-edit",
                  params: { shipmentId: id },
                })
              }
            >
              <Text color={Colors.primary} fontWeight="bold">
                Edit
              </Text>
            </Button>
          )}
        </XStack>

        <YStack paddingHorizontal="$4" gap="$4">
          {/* 2. Status Card */}
          <Card
            backgroundColor={Colors.card}
            padding="$4"
            borderRadius="$4"
            borderColor={Colors.cardBorder}
            borderWidth={1}
          >
            <XStack
              justifyContent="space-between"
              alignItems="flex-start"
              marginBottom="$2"
            >
              <YStack>
                <Text color={Colors.textGray} fontSize={10} letterSpacing={1}>
                  SHIPMENT ID
                </Text>
                <Text color="white" fontSize={14} fontWeight="bold">
                  #{typeof id === "string" ? id.slice(-6).toUpperCase() : "---"}
                </Text>
              </YStack>
              <YStack
                backgroundColor={`${statusColor}20`}
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$4"
                borderColor={`${statusColor}50`}
                borderWidth={1}
              >
                <Text
                  color={statusColor}
                  fontSize={11}
                  fontWeight="bold"
                  textTransform="uppercase"
                >
                  {shipment.status}
                </Text>
              </YStack>
            </XStack>

            <XStack gap="$4" marginTop="$2">
              <XStack gap="$2" alignItems="center">
                <Feather name="calendar" size={14} color={Colors.textGray} />
                <Text color={Colors.textGray} fontSize={12}>
                  {new Date(shipment.shippedAt).toDateString()}
                </Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Feather name="user" size={14} color={Colors.textGray} />
                <Text color={Colors.textGray} fontSize={12}>
                  {shipment.sender?.name || user?.name}
                </Text>
              </XStack>
            </XStack>
          </Card>

          {/* 3. Financial Stats */}
          <XStack gap="$3">
            <Card
              flex={1}
              backgroundColor={Colors.card}
              padding="$3"
              borderRadius="$4"
              borderColor={Colors.cardBorder}
              borderWidth={1}
            >
              <Text color={Colors.textGray} fontSize={10}>
                TOTAL QTY
              </Text>
              <H3 color="white">{shipment.totalQuantity}</H3>
            </Card>
            <Card
              flex={1}
              backgroundColor={Colors.card}
              padding="$3"
              borderRadius="$4"
              borderColor={Colors.cardBorder}
              borderWidth={1}
            >
              <Text color={Colors.textGray} fontSize={10}>
                PAYOUT
              </Text>
              <H3 color={Colors.accent}>₹ {shipment.totalAmount}</H3>
            </Card>
          </XStack>

          <Separator borderColor={Colors.cardBorder} />

          {/* 4. Items List */}
          <YStack gap="$3">
            <Text
              color={Colors.textGray}
              fontSize={12}
              fontWeight="bold"
              letterSpacing={1}
            >
              SHIPMENT CONTENTS
            </Text>

            {shipment.items.map((item: any, index: number) => {
              // Handle case where product might be populated or just an ID
              const productName = item.product?.name || "Unknown Item";
              const productBrand = item.product?.brand || "N/A";
              const productImg =
                item.product?.photoUrl || "https://placehold.co/100";

              return (
                <Card
                  key={index}
                  backgroundColor={Colors.card}
                  padding="$3"
                  borderRadius="$4"
                  borderColor={Colors.cardBorder}
                  borderWidth={1}
                >
                  <XStack gap="$3" alignItems="center">
                    {/* Product Image */}
                    <YStack
                      width={50}
                      height={50}
                      borderRadius="$2"
                      overflow="hidden"
                      backgroundColor="black"
                    >
                      <RNImage
                        source={{ uri: productImg }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </YStack>

                    <YStack flex={1}>
                      <Text color="white" fontWeight="bold">
                        {productName}
                      </Text>
                      <Text color={Colors.textGray} fontSize={11}>
                        Brand: {productBrand}
                      </Text>
                    </YStack>

                    <YStack alignItems="flex-end">
                      <Text color="white" fontWeight="bold" fontSize={16}>
                        {item.quantity}
                      </Text>
                      <Text color={Colors.textGray} fontSize={10}>
                        units
                      </Text>
                    </YStack>
                  </XStack>
                </Card>
              );
            })}
          </YStack>

          {/* 5. Payment Status Footer */}
          <Card
            backgroundColor={
              shipment.paymentStatus === "paid"
                ? "rgba(0, 200, 81, 0.1)"
                : Colors.card
            }
            padding="$3"
            borderRadius="$4"
            marginTop="$2"
            borderColor={
              shipment.paymentStatus === "paid"
                ? Colors.success
                : Colors.cardBorder
            }
            borderWidth={1}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <XStack gap="$3" alignItems="center">
                <YStack
                  width={30}
                  height={30}
                  borderRadius="$10"
                  backgroundColor={
                    shipment.paymentStatus === "paid"
                      ? Colors.success
                      : Colors.textGray
                  }
                  justifyContent="center"
                  alignItems="center"
                >
                  <Feather
                    name={shipment.paymentStatus === "paid" ? "check" : "clock"}
                    size={16}
                    color="white"
                  />
                </YStack>
                <YStack>
                  <Text color="white" fontWeight="bold">
                    Payment Status
                  </Text>
                  <Text color={Colors.textGray} fontSize={11}>
                    {shipment.paymentStatus === "paid"
                      ? "Funds have been transferred."
                      : "Waiting for admin approval."}
                  </Text>
                </YStack>
              </XStack>
              <Text
                color={
                  shipment.paymentStatus === "paid"
                    ? Colors.success
                    : Colors.textGray
                }
                fontWeight="bold"
                textTransform="uppercase"
              >
                {shipment.paymentStatus}
              </Text>
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
