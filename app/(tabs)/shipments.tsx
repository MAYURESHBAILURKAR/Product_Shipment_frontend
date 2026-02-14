import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, H3, Spinner, Text, XStack, YStack } from "tamagui";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext"; // ✅ Import Theme

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

export default function ShipmentHistoryScreen() {
  const { user } = useAuth();
  const { Colors } = useTheme(); // ✅ Use Dynamic Colors
  const router = useRouter();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      if (!refreshing) setLoading(true);
      const { data } = await axios.get(`${API_URL}/shipments/myshipments`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      // Sort: Newest first
      setShipments(
        data.sort(
          (a: any, b: any) =>
            new Date(b.shippedAt).getTime() - new Date(a.shippedAt).getTime(),
        ),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, []),
  );

  // Helper for Status Colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "received":
        return Colors.success;
      case "rejected":
        return Colors.danger;
      default:
        return "#FFBB33"; // Warning/Yellow
    }
  };

  const renderItem = ({ item }: any) => {
    const statusColor = getStatusColor(item.status);
    const isPending = item.status === "pending";

    return (
      <Card
        backgroundColor={Colors.card}
        borderColor={Colors.cardBorder}
        borderWidth={1}
        padding="$4"
        marginBottom="$3"
        borderRadius="$4"
        elevation={2}
        pressStyle={{ scale: 0.98 }} // Add a little press effect
        onPress={() =>
          router.push({
            pathname: "/shipment/[id]",
            params: { id: item._id },
          })
        }
      >
        {/* Top Row: Date & Status */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          marginBottom="$3"
        >
          <XStack gap="$2" alignItems="center">
            <Feather name="calendar" size={12} color={Colors.textGray} />
            <Text color={Colors.textGray} fontSize={12} fontWeight="600">
              {new Date(item.shippedAt).toLocaleDateString()}
            </Text>
          </XStack>

          <YStack
            backgroundColor={`${statusColor}20`} // Transparent background
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$4"
            borderColor={`${statusColor}50`}
            borderWidth={1}
          >
            <Text
              color={statusColor}
              fontSize={10}
              fontWeight="bold"
              textTransform="uppercase"
            >
              {item.status}
            </Text>
          </YStack>
        </XStack>

        {/* Middle Row: Content */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$3" alignItems="center">
            <YStack
              width={40}
              height={40}
              borderRadius="$10"
              backgroundColor={Colors.background}
              justifyContent="center"
              alignItems="center"
              borderColor={Colors.cardBorder}
              borderWidth={1}
            >
              <Feather name="package" size={20} color={Colors.primary} />
            </YStack>
            <YStack>
              <H3 fontSize={16} color="white" fontWeight="bold">
                {item.totalQuantity} Units
              </H3>
              <Text color={Colors.textGray} fontSize={12}>
                {item.items.length} Product Types
              </Text>
            </YStack>
          </XStack>

          {/* Action Column */}
          {isPending ? (
            <Button
              size="$2"
              backgroundColor={Colors.primary}
              icon={<Feather name="edit-2" size={14} color="white" />}
              onPress={() =>
                router.push({
                  pathname: "/shipment-edit",
                  params: { shipmentId: item._id },
                })
              }
            >
              <Text color="white" fontSize={12} fontWeight="bold">
                Edit
              </Text>
            </Button>
          ) : (
            <YStack alignItems="flex-end">
              <Text color={Colors.textGray} fontSize={10}>
                TOTAL PAYOUT
              </Text>
              <Text color={Colors.accent} fontSize={16} fontWeight="bold">
                ₹ {item.totalAmount}
              </Text>
            </YStack>
          )}
        </XStack>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <YStack paddingHorizontal="$4" flex={1} paddingTop="$2">
        {/* Header */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          marginBottom="$4"
        >
          <YStack>
            <Text
              color={Colors.textGray}
              fontSize={10}
              letterSpacing={1}
              fontWeight="bold"
            >
              OVERVIEW
            </Text>
            <H3 color="white" fontWeight="bold">
              Shipment History
            </H3>
          </YStack>

          {/* Refresh Button (Optional visual cue) */}
          <TouchableOpacity
            onPress={() => {
              setRefreshing(true);
              fetchHistory();
            }}
          >
            <Feather name="refresh-cw" size={18} color={Colors.textGray} />
          </TouchableOpacity>
        </XStack>

        {/* List */}
        {loading && !refreshing ? (
          <Spinner size="large" color={Colors.primary} marginTop="$10" />
        ) : (
          <FlatList
            data={shipments}
            keyExtractor={(item: any) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }} // Space for FAB
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchHistory();
                }}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={
              <YStack alignItems="center" marginTop="$10" gap="$2">
                <Feather name="inbox" size={40} color={Colors.cardBorder} />
                <Text color={Colors.textGray}>No shipments found.</Text>
              </YStack>
            }
          />
        )}

        {/* Floating Action Button (FAB) */}
        <Button
          position="absolute"
          bottom={90} // Adjust based on Tab Bar height
          right={20}
          size="$6"
          circular
          backgroundColor={Colors.primary}
          elevation={10}
          pressStyle={{ scale: 0.95 }}
          onPress={() => router.push("/shipment-new")}
          icon={<Feather name="plus" size={28} color="white" />}
        />
      </YStack>
    </SafeAreaView>
  );
}
