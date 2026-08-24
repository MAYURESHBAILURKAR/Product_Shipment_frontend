import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  Card,
  H2,
  H3,
  Separator,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";
const SCREEN_WIDTH = Dimensions.get("window").width;

// Nexus Color Palette
const Colors = {
  background: "#0B0E14",
  card: "#151A23",
  cardBorder: "#232936",
  primary: "#2F80ED",
  textGray: "#9CA3AF",
  success: "#00C851",
  accent: "#4CC9F0",
};

export default function ProductionDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    stock: 0,
    earnings: 0,
    shipmentCount: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const productsRes = await axios.get(`${API_URL}/products/myproducts`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const totalStock = productsRes.data.reduce(
        (acc: number, item: any) => acc + item.currentStock,
        0,
      );

      const shipmentsRes = await axios.get(`${API_URL}/shipments/myshipments`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const totalEarnings = shipmentsRes.data.reduce(
        (acc: number, item: any) => acc + item.totalAmount,
        0,
      );

      setStats({
        stock: totalStock,
        earnings: totalEarnings,
        shipmentCount: shipmentsRes.data.length,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, []),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchStats}
            tintColor={Colors.primary}
          />
        }
      >
        <YStack padding="$4" gap="$5">
          {/* 1. Modern Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <XStack gap="$3" alignItems="center">
              <Avatar
                circular
                size="$5"
                onPress={() => router.push("/profile")}
              >
                <Avatar.Image
                  src={`https://ui-avatars.com/api/?name=${user?.name}&background=2F80ED&color=fff`}
                />
                <Avatar.Fallback backgroundColor={Colors.primary} />
              </Avatar>
              <YStack>
                <Text
                  color={Colors.textGray}
                  fontSize={12}
                  textTransform="uppercase"
                  letterSpacing={1}
                >
                  Good Morning,
                </Text>
                <H2 color="white" fontWeight="bold">
                  {user?.name?.split(" ")[0]}
                </H2>
              </YStack>
            </XStack>

            <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
              <YStack
                backgroundColor={Colors.card}
                padding="$2"
                borderRadius="$10"
                borderColor={Colors.cardBorder}
                borderWidth={1}
              >
                <Feather name="bell" size={20} color="white" />
              </YStack>
            </TouchableOpacity>
          </XStack>

          {/* 2. Visual Stats Cards (Gradient) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <LinearGradient
              colors={["#2F80ED", "#56CCF2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 20,
                width: SCREEN_WIDTH * 0.45,
                height: 150,
                justifyContent: "space-between",
              }}
            >
              <YStack
                backgroundColor="rgba(255,255,255,0.2)"
                alignSelf="flex-start"
                padding="$2"
                borderRadius="$3"
              >
                <Feather name="box" size={20} color="white" />
              </YStack>
              <YStack>
                <Text
                  color="rgba(255,255,255,0.8)"
                  fontSize={12}
                  fontWeight="600"
                >
                  IN STOCK
                </Text>
                <H2 color="white" fontWeight="800">
                  {stats.stock}
                </H2>
              </YStack>
            </LinearGradient>

            <LinearGradient
              colors={["#00b09b", "#96c93d"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 20,
                width: SCREEN_WIDTH * 0.42,
                height: 150,
                justifyContent: "space-between",
              }}
            >
              <YStack
                backgroundColor="rgba(255,255,255,0.2)"
                alignSelf="flex-start"
                padding="$2"
                borderRadius="$3"
              >
                <Feather name="trending-up" size={20} color="white" />
              </YStack>
              <YStack>
                <Text
                  color="rgba(255,255,255,0.8)"
                  fontSize={12}
                  fontWeight="600"
                >
                  EARNINGS
                </Text>
                <H2 color="white" fontWeight="800">
                  ₹{stats.earnings}
                </H2>
              </YStack>
            </LinearGradient>
          </ScrollView>

          {/* 3. Action Grid (Shortcut Buttons) */}
          <XStack justifyContent="space-between" gap="$3">
            {[
              {
                label: "New Ship",
                icon: "plus-circle",
                route: "/shipment-new",
              },
              {
                label: "Inventory",
                icon: "package",
                route: "/(tabs)/products",
              },
              { label: "History", icon: "list", route: "/shipment-tracker" },
              {
                label: "Reports",
                icon: "bar-chart-2",
                route: "/(tabs)/shipments",
              },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => router.push(item.route as any)}
                style={{ flex: 1, alignItems: "center" }}
              >
                <YStack
                  backgroundColor={Colors.card}
                  padding="$3"
                  borderRadius="$5"
                  borderColor={Colors.cardBorder}
                  borderWidth={1}
                  alignItems="center"
                  width="100%"
                  gap="$2"
                >
                  <Feather
                    name={item.icon as any}
                    size={22}
                    color={Colors.primary}
                  />
                  <Text color="white" fontSize={10} fontWeight="600">
                    {item.label}
                  </Text>
                </YStack>
              </TouchableOpacity>
            ))}
          </XStack>

          {/* 4. Shipment Summary Section */}
          <YStack gap="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <H3 color="white">Recent Activity</H3>
              <TouchableOpacity
                onPress={() => router.push("/shipment-tracker")}
              >
                <Text color={Colors.primary} fontWeight="bold">
                  View All
                </Text>
              </TouchableOpacity>
            </XStack>

            <Card
              backgroundColor={Colors.card}
              borderColor={Colors.cardBorder}
              borderWidth={1}
              borderRadius="$6"
              overflow="hidden"
            >
              <YStack padding="$4" gap="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack gap="$3" alignItems="center">
                    <YStack
                      backgroundColor="rgba(47, 128, 237, 0.1)"
                      padding="$2"
                      borderRadius="$3"
                    >
                      <Feather name="truck" size={18} color={Colors.primary} />
                    </YStack>
                    <YStack>
                      <Text color="white" fontWeight="600">
                        Total Shipments
                      </Text>
                      <Text color={Colors.textGray} fontSize={12}>
                        Historical volume
                      </Text>
                    </YStack>
                  </XStack>
                  <H3 color="white">{stats.shipmentCount}</H3>
                </XStack>
                <Separator borderColor={Colors.cardBorder} />
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack gap="$3" alignItems="center">
                    <YStack
                      backgroundColor="rgba(76, 201, 240, 0.1)"
                      padding="$2"
                      borderRadius="$3"
                    >
                      <Feather
                        name="dollar-sign"
                        size={18}
                        color={Colors.accent}
                      />
                    </YStack>
                    <YStack>
                      <Text color="white" fontWeight="600">
                        Payout Rate
                      </Text>
                      <Text color={Colors.textGray} fontSize={12}>
                        Standard unit price
                      </Text>
                    </YStack>
                  </XStack>
                  <Text color={Colors.accent} fontWeight="bold">
                    ₹ {user?.priceAllotted}
                  </Text>
                </XStack>
              </YStack>
            </Card>
          </YStack>

          {/* 5. Production Action Banner */}
          <Card
            backgroundColor={Colors.card}
            borderColor={Colors.primary}
            borderWidth={1}
            borderRadius="$6"
            padding="$5"
            gap="$3"
          >
            <H3 color="white">Inventory Ready?</H3>
            <Text color={Colors.textGray} fontSize={14}>
              You currently have{" "}
              <Text color="white" fontWeight="bold">
                {stats.stock} items
              </Text>{" "}
              processed. Create a shipment to move them to the warehouse and
              update your earnings.
            </Text>
            <Button
              backgroundColor={Colors.primary}
              // ✅ Move the icon component to iconAfter instead of using a boolean
              iconAfter={<Feather name="arrow-right" size={18} color="white" />}
              onPress={() => router.push("/shipment-new")}
              borderRadius="$4"
              marginTop="$2"
              pressStyle={{ opacity: 0.8 }} // Added for better touch feedback
            >
              <Text color="white" fontWeight="bold">
                Start Shipment Process
              </Text>
            </Button>
          </Card>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
