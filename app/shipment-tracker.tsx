import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H2,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useAuth } from "../src/context/AuthContext";

// ⚠️ REPLACE IP
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Nexus Colors
const Colors = {
  background: "#0B0E14",
  card: "#151A23",
  cardBorder: "#232936",
  primary: "#2F80ED",
  textGray: "#9CA3AF",
  success: "#00C851", // Green for Received
  warning: "#FFBB33", // Yellow for Pending
  info: "#4CC9F0", // Blue for In Transit
  danger: "#FF4444",
};

export default function ShipmentTrackerScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter State
  const [timeFilter, setTimeFilter] = useState("month");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Pending, Received
  const [selectedUser, setSelectedUser] = useState("all");
  const [customDate, setCustomDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint =
        user?.role === "admin" ? "/shipments" : "/shipments/myshipments";
      const { data } = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      // Sort by newest first
      setAllShipments(
        data.sort(
          (a: any, b: any) =>
            new Date(b.shippedAt).getTime() - new Date(a.shippedAt).getTime(),
        ),
      );

      if (user?.role === "admin") {
        const userRes = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        setUsers(userRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const filteredData = useMemo(() => {
    let data = allShipments;

    // 1. User Filter
    if (user?.role === "admin" && selectedUser !== "all") {
      data = data.filter(
        (item) =>
          item.sender?._id === selectedUser || item.sender === selectedUser,
      );
    }

    // 2. Status Filter
    if (statusFilter !== "All") {
      data = data.filter(
        (item) => item.status.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    // 3. Time Filter
    const now = new Date();
    data = data.filter((item) => {
      const itemDate = new Date(item.shippedAt);
      switch (timeFilter) {
        case "day":
          return itemDate.toDateString() === customDate.toDateString();
        case "week":
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return itemDate >= oneWeekAgo;
        case "month":
          return (
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear()
          );
        case "year":
          return itemDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
    return data;
  }, [allShipments, timeFilter, selectedUser, customDate, statusFilter]);

  // Helper for Status Colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return Colors.success;
      case "pending":
        return Colors.warning;
      default:
        return Colors.info;
    }
  };

  const renderItem = ({ item }: any) => {
    const statusColor = getStatusColor(item.status);

    return (
      <Card
        backgroundColor={Colors.card}
        borderColor={Colors.cardBorder}
        borderWidth={1}
        borderRadius="$4"
        padding="$3"
        marginBottom="$3"
        pressStyle={{ scale: 0.98 }}
        onPress={() =>
          router.push({
            pathname: "/shipment/[id]",
            params: { id: item._id },
          })
        }
      >
        <XStack
          justifyContent="space-between"
          alignItems="flex-start"
          marginBottom="$2"
        >
          <XStack gap="$3" alignItems="center">
            {/* Icon Box */}
            <YStack
              width={40}
              height={40}
              borderRadius="$3"
              backgroundColor={`${statusColor}20`} // 20% opacity hex
              justifyContent="center"
              alignItems="center"
              borderColor={`${statusColor}50`}
              borderWidth={1}
            >
              <Feather name="package" size={20} color={statusColor} />
            </YStack>

            <YStack>
              <Text color="white" fontWeight="bold" fontSize={14}>
                Shipment #{item._id.slice(-4).toUpperCase()}
              </Text>
              {user?.role === "admin" && (
                <Text color={Colors.primary} fontSize={12}>
                  {item.sender?.name || "User"}
                </Text>
              )}
              <Text color={Colors.textGray} fontSize={11}>
                {new Date(item.shippedAt).toDateString()}
              </Text>
            </YStack>
          </XStack>

          {/* Status Pill */}
          <YStack
            backgroundColor={`${statusColor}20`}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
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

        <Separator borderColor={Colors.cardBorder} marginVertical="$2" />

        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text color={Colors.textGray} fontSize={11}>
              ITEMS
            </Text>
            <Text color="white" fontWeight="bold">
              {item.totalQuantity}
            </Text>
          </YStack>
          <YStack alignItems="flex-end">
            <Text color={Colors.textGray} fontSize={11}>
              VALUE
            </Text>
            <Text color="white" fontWeight="bold">
              ₹ {item.totalAmount}
            </Text>
          </YStack>
        </XStack>
      </Card>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <YStack padding="$4" flex={1} gap="$4">
        {/* Header */}
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap="$3">
            <Button
              chromeless
              icon={<Feather name="arrow-left" size={24} color="white" />}
              onPress={() => router.back()}
            />
            <H2 color="white">Shipment Logs</H2>
          </XStack>
          {/* Date Picker Trigger */}
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Feather name="calendar" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </XStack>

        {/* --- FILTERS SECTION --- */}
        <YStack gap="$3">
          {/* 1. Status Tabs (Pills) */}
          <XStack gap="$2">
            {["All", "Pending", "Received"].map((status) => (
              <Button
                key={status}
                size="$3"
                backgroundColor={
                  statusFilter === status ? Colors.primary : Colors.card
                }
                borderColor={Colors.cardBorder}
                borderWidth={1}
                borderRadius="$10"
                onPress={() => setStatusFilter(status)}
                pressStyle={{ opacity: 0.8 }}
              >
                <Text
                  color={statusFilter === status ? "white" : Colors.textGray}
                  fontSize={12}
                  fontWeight="600"
                >
                  {status}
                </Text>
              </Button>
            ))}
          </XStack>

          {/* 2. Time Filters (Text Links) */}
          <XStack
            justifyContent="space-around"
            borderBottomColor={Colors.cardBorder}
            borderBottomWidth={1}
            paddingBottom="$2"
          >
            {["week", "month", "year", "all"].map((tf) => (
              <TouchableOpacity key={tf} onPress={() => setTimeFilter(tf)}>
                <Text
                  color={timeFilter === tf ? Colors.primary : Colors.textGray}
                  fontWeight={timeFilter === tf ? "bold" : "normal"}
                  textTransform="capitalize"
                >
                  {tf}
                </Text>
              </TouchableOpacity>
            ))}
          </XStack>

          {showDatePicker && (
            <DateTimePicker
              value={customDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) {
                  setCustomDate(date);
                  setTimeFilter("day");
                }
              }}
            />
          )}

          {/* 3. User Dropdown (Admin Only) */}
          {user?.role === "admin" && (
            <XStack overflow="scroll" gap="$2" paddingVertical="$2">
              <Button
                size="$2"
                borderRadius="$4"
                backgroundColor={
                  selectedUser === "all" ? Colors.primary : Colors.card
                }
                onPress={() => setSelectedUser("all")}
              >
                All Users
              </Button>
              {users.map((u) => (
                <Button
                  key={u._id}
                  size="$2"
                  borderRadius="$4"
                  backgroundColor={
                    selectedUser === u._id ? Colors.primary : Colors.card
                  }
                  onPress={() => setSelectedUser(u._id)}
                >
                  {u.name}
                </Button>
              ))}
            </XStack>
          )}
        </YStack>

        {/* --- LIST --- */}
        {loading ? (
          <Spinner size="large" color={Colors.primary} marginTop="$10" />
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item: any) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <YStack alignItems="center" marginTop="$10" gap="$2">
                <Feather name="inbox" size={40} color={Colors.cardBorder} />
                <Text color={Colors.textGray}>
                  No logs found for this filter.
                </Text>
              </YStack>
            }
          />
        )}
      </YStack>
    </SafeAreaView>
  );
}
