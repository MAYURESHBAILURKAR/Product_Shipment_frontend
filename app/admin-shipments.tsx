import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  Card,
  H3,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useAuth } from "../src/context/AuthContext";
import { useTheme } from "../src/context/ThemeContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

export default function AdminShipmentsScreen() {
  const { user } = useAuth();
  const { Colors } = useTheme();
  const router = useRouter();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShipments = async () => {
    try {
      if (!refreshing) setLoading(true);
      const { data } = await axios.get(`${API_URL}/shipments`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      // Sort by newest
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
      fetchShipments();
    }, []),
  );

  const handleUpdateStatus = async (id: string, updates: any) => {
    try {
      await axios.put(`${API_URL}/shipments/${id}`, updates, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      // Optimistic update for smoother UI
      setShipments((prev: any) =>
        prev.map((s: any) => (s._id === id ? { ...s, ...updates } : s)),
      );
    } catch (error) {
      Alert.alert("Error", "Update failed");
    }
  };

  const renderShipment = ({ item }: any) => {
    const isPending = item.status === "pending";
    const isUnpaid = item.paymentStatus === "unpaid";

    return (
      <Card
        backgroundColor={Colors.card}
        borderColor={Colors.cardBorder}
        borderWidth={1}
        padding="$4"
        marginBottom="$3"
        borderRadius="$4"
        elevation={2}
      >
        {/* Header: User & Date */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          marginBottom="$3"
        >
          <XStack gap="$3" alignItems="center">
            <Avatar circular size="$3">
              <Avatar.Image
                src={`https://ui-avatars.com/api/?name=${item.sender?.name}&background=random`}
              />
              <Avatar.Fallback backgroundColor={Colors.primary} />
            </Avatar>
            <YStack>
              <Text color="white" fontWeight="bold" fontSize={14}>
                {item.sender?.name || "Unknown User"}
              </Text>
              <Text color={Colors.textGray} fontSize={11}>
                {new Date(item.shippedAt).toDateString()}
              </Text>
            </YStack>
          </XStack>

          {/* ID Badge */}
          <YStack
            backgroundColor={Colors.background}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text color={Colors.textGray} fontSize={10}>
              #{item._id.slice(-4).toUpperCase()}
            </Text>
          </YStack>
        </XStack>

        <Separator borderColor={Colors.cardBorder} marginBottom="$3" />

        {/* Stats Grid */}
        <XStack justifyContent="space-between" marginBottom="$4">
          <YStack>
            <Text color={Colors.textGray} fontSize={11} letterSpacing={1}>
              QUANTITY
            </Text>
            <H3 color="white" fontSize={18}>
              {item.totalQuantity}
            </H3>
          </YStack>
          <YStack alignItems="flex-end">
            <Text color={Colors.textGray} fontSize={11} letterSpacing={1}>
              PAYOUT VALUE
            </Text>
            <H3 color={Colors.accent} fontSize={18}>
              ₹ {item.totalAmount}
            </H3>
          </YStack>
        </XStack>

        {/* Action Buttons Row */}
        <XStack gap="$3">
          {/* Status Button */}
          <Button
            flex={1}
            size="$3"
            backgroundColor={
              isPending ? "rgba(0, 200, 81, 0.15)" : Colors.background
            }
            borderColor={isPending ? Colors.success : Colors.cardBorder}
            borderWidth={1}
            disabled={!isPending}
            onPress={() =>
              isPending && handleUpdateStatus(item._id, { status: "received" })
            }
            icon={
              !isPending ? (
                <Feather name="check" color={Colors.textGray} />
              ) : undefined
            }
          >
            <Text
              color={isPending ? Colors.success : Colors.textGray}
              fontWeight="bold"
            >
              {isPending ? "Mark Received" : "Received"}
            </Text>
          </Button>

          {/* Payment Button */}
          <Button
            flex={1}
            size="$3"
            backgroundColor={
              isUnpaid ? "rgba(47, 128, 237, 0.15)" : Colors.background
            }
            borderColor={isUnpaid ? Colors.primary : Colors.cardBorder}
            borderWidth={1}
            disabled={!isUnpaid}
            onPress={() =>
              isUnpaid &&
              handleUpdateStatus(item._id, { paymentStatus: "paid" })
            }
            icon={
              !isUnpaid ? (
                <Feather name="check" color={Colors.textGray} />
              ) : undefined
            }
          >
            <Text
              color={isUnpaid ? Colors.primary : Colors.textGray}
              fontWeight="bold"
            >
              {isUnpaid ? "Mark Paid" : "Paid"}
            </Text>
          </Button>
        </XStack>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <YStack paddingHorizontal="$4" flex={1} paddingTop="$2">
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
              ADMINISTRATION
            </Text>
            <H3 color="white" fontWeight="bold">
              Manage Shipments
            </H3>
          </YStack>
        </XStack>

        {loading && !refreshing ? (
          <Spinner size="large" color={Colors.primary} marginTop="$10" />
        ) : (
          <FlatList
            data={shipments}
            keyExtractor={(item: any) => item._id}
            renderItem={renderShipment}
            contentContainerStyle={{ paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchShipments();
            }}
            ListEmptyComponent={
              <YStack alignItems="center" marginTop="$10" gap="$2">
                <Feather name="inbox" size={40} color={Colors.cardBorder} />
                <Text color={Colors.textGray}>No shipments found.</Text>
              </YStack>
            }
          />
        )}
      </YStack>
    </SafeAreaView>
  );
}
