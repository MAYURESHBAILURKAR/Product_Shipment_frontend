import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient"; // Install this
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Dimensions, FlatList, TouchableOpacity } from "react-native";
import { LineChart } from "react-native-chart-kit"; // Install this
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  Card,
  H2,
  H3,
  Input,
  ScrollView,
  Sheet,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";
const SCREEN_WIDTH = Dimensions.get("window").width;

// Nexus Colors
// const Colors = {
//   background: "#0B0E14",
//   card: "#151A23",
//   cardBorder: "#232936",
//   primary: "#2F80ED",
//   text: "#FFFFFF",
//   textGray: "#9CA3AF",
//   success: "#00C851",
//   danger: "#FF4444",
// };

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { Colors } = useTheme();

  // Data State
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Search & Filter State (NEW FEATURES)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("All"); // All, Active, Inactive

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [locality, setLocality] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [chartData, setChartData] = useState({
    labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
  });

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartStats = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/shipments/stats/weekly`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      // Map the 1-7 (Sun-Sat) response to the array
      const quantities = [0, 0, 0, 0, 0, 0, 0];
      data.forEach((stat: any) => {
        quantities[stat._id - 1] = stat.totalQuantity;
      });

      setChartData({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [{ data: quantities }],
      });
    } catch (error) {
      console.error("Chart fetch error:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
      fetchChartStats(); // Call this here
    }, []),
  );

  // --- FILTER LOGIC (NEW) ---
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.locality?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterTab === "All"
          ? true
          : filterTab === "Active"
            ? u.isActive
            : !u.isActive;

      return matchesSearch && matchesFilter;
    });
  }, [users, searchQuery, filterTab]);

  // --- FORM HANDLERS (Keep existing logic) ---
  const openAddMode = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setMobile("");
    setLocality("");
    setPrice("");
    setPassword("");
    setIsActive(true);
    setOpenSheet(true);
  };

  const openEditMode = (item: any) => {
    setEditingUser(item);
    setName(item.name || "");
    setEmail(item.email || "");
    setMobile(item.mobile || "");
    setLocality(item.locality || "");
    setPrice(item.priceAllotted?.toString() || "");
    setIsActive(item.isActive !== false);
    setPassword("");
    setOpenSheet(true);
  };

  const handleSaveUser = async () => {
    if (!name || !email || !price) {
      Alert.alert("Error", "Name, Email, and Price Rate are required.");
      return;
    }
    setUploading(true);
    try {
      const payload: any = {
        name,
        email,
        mobile,
        locality,
        priceAllotted: Number(price),
        isActive,
      };
      if (password) payload.password = password;

      if (editingUser) {
        await axios.put(`${API_URL}/users/${editingUser._id}`, payload, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        Alert.alert("Success", "User Updated");
      } else {
        if (!password) {
          Alert.alert("Error", "Password is required for new users");
          setUploading(false);
          return;
        }
        await axios.post(`${API_URL}/users`, payload, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        Alert.alert("Success", "User Created");
      }
      setOpenSheet(false);
      fetchUsers();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Operation failed");
    } finally {
      setUploading(false);
    }
  };

  // UI COMPONENTS

  const renderUser = ({ item }: any) => (
    <Card
      backgroundColor={Colors.card}
      borderColor={Colors.cardBorder}
      borderWidth={1}
      padding="$4"
      marginBottom="$3"
      borderRadius="$6"
      opacity={item.isActive ? 1 : 0.6}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$3" alignItems="center" flex={1}>
          {/* User Avatar with Status Dot */}
          <YStack>
            <Avatar circular size="$5">
              <Avatar.Image
                src={`https://ui-avatars.com/api/?name=${item.name}&background=random`}
              />
              <Avatar.Fallback backgroundColor="$gray8" />
            </Avatar>
            <YStack
              position="absolute"
              bottom={0}
              right={0}
              width={12}
              height={12}
              borderRadius={6}
              backgroundColor={item.isActive ? Colors.success : Colors.textGray}
              borderColor={Colors.card}
              borderWidth={2}
            />
          </YStack>

          <YStack flex={1}>
            <H3 fontSize={16} color="white" fontWeight="600">
              {item.name}
            </H3>
            <Text color={Colors.textGray} fontSize={12} numberOfLines={1}>
              {item.locality || "No Locality"} • ₹{item.priceAllotted}/unit
            </Text>
          </YStack>
        </XStack>

        {/* Edit Button (Pencil Icon) */}
        <TouchableOpacity
          onPress={() => openEditMode(item)}
          style={{ padding: 8 }}
        >
          <Feather name="edit-2" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </XStack>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <YStack flex={1} paddingHorizontal="$4" paddingTop="$2">
        {loading ? (
          <Spinner size="large" color={Colors.primary} marginTop="$10" />
        ) : (
          <FlatList
            ListHeaderComponent={
              <YStack gap="$5" marginBottom="$2">
                {/* 1. Header with Avatar */}
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack>
                    <Text
                      color={Colors.textGray}
                      fontSize={12}
                      textTransform="uppercase"
                      letterSpacing={1}
                    >
                      {new Date().toDateString()}
                    </Text>
                    <H2 color="white" fontWeight="bold">
                      Dashboard
                    </H2>
                  </YStack>
                  <Avatar
                    circular
                    size="$5"
                    onPress={() => router.push("/profile")}
                  >
                    <Avatar.Image src="https://i.pravatar.cc/150?img=68" />
                    <Avatar.Fallback backgroundColor="$blue10" />
                  </Avatar>
                </XStack>

                {/* 2. Overview Cards (Gradient) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {/* Total Users Card */}
                  <LinearGradient
                    colors={["#1e3c72", "#2a5298"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 16,
                      padding: 20,
                      width: 160,
                      height: 140,
                      justifyContent: "space-between",
                    }}
                  >
                    <YStack
                      backgroundColor="rgba(255,255,255,0.2)"
                      alignSelf="flex-start"
                      padding="$2"
                      borderRadius="$3"
                    >
                      <Feather name="users" size={20} color="white" />
                    </YStack>
                    <YStack>
                      <Text color={Colors.textGray} fontSize={12}>
                        Total Users
                      </Text>
                      <H2 color="white">{users.length}</H2>
                    </YStack>
                  </LinearGradient>

                  {/* Action Card: Shipments */}
                  <TouchableOpacity
                    onPress={() => router.push("/admin-shipments")}
                  >
                    <LinearGradient
                      colors={["#360033", "#0b8793"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 16,
                        padding: 20,
                        width: 160,
                        height: 140,
                        justifyContent: "space-between",
                      }}
                    >
                      <YStack
                        backgroundColor="rgba(255,255,255,0.2)"
                        alignSelf="flex-start"
                        padding="$2"
                        borderRadius="$3"
                      >
                        <Feather name="truck" size={20} color="white" />
                      </YStack>
                      <YStack>
                        <Text color={Colors.textGray} fontSize={12}>
                          Shipments
                        </Text>
                        <XStack alignItems="center" gap="$2">
                          <H2 color="white">Manage</H2>
                          <Feather name="arrow-right" color="white" size={16} />
                        </XStack>
                      </YStack>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Action Card: Reports */}
                  <TouchableOpacity
                    onPress={() => router.push("/admin-reports")}
                  >
                    <LinearGradient
                      colors={["#134E5E", "#71B280"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 16,
                        padding: 20,
                        width: 160,
                        height: 140,
                        justifyContent: "space-between",
                      }}
                    >
                      <YStack
                        backgroundColor="rgba(255,255,255,0.2)"
                        alignSelf="flex-start"
                        padding="$2"
                        borderRadius="$3"
                      >
                        <Feather name="bar-chart-2" size={20} color="white" />
                      </YStack>
                      <YStack>
                        <Text color={Colors.textGray} fontSize={12}>
                          Analytics
                        </Text>
                        <H2 color="white">Reports</H2>
                      </YStack>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Action Card: Shipments Logs */}
                  <TouchableOpacity
                    onPress={() => router.push("/shipment-tracker")}
                  >
                    <LinearGradient
                      colors={["#360033", "#0b8793"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 16,
                        padding: 20,
                        width: 160,
                        height: 140,
                        justifyContent: "space-between",
                      }}
                    >
                      <YStack
                        backgroundColor="rgba(255,255,255,0.2)"
                        alignSelf="flex-start"
                        padding="$2"
                        borderRadius="$3"
                      >
                        <Feather name="file" size={20} color="white" />
                      </YStack>
                      <YStack>
                        <Text color={Colors.textGray} fontSize={12}>
                          Shipments
                        </Text>
                        <XStack alignItems="center" gap="$2">
                          <H2 color="white">Logs</H2>
                          <Feather name="arrow-right" color="white" size={16} />
                        </XStack>
                      </YStack>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>

                {/* 3. Production Trend Chart (Mock Data for UI) */}
                <YStack
                  backgroundColor={Colors.card}
                  padding="$4"
                  borderRadius="$5"
                  borderColor={Colors.cardBorder}
                  borderWidth={1}
                >
                  <XStack justifyContent="space-between" marginBottom="$4">
                    <H3 color="white" fontSize={16}>
                      Production Trend
                    </H3>
                    <XStack gap="$2">
                      <Button size="$2" backgroundColor="$blue10" color="white">
                        W
                      </Button>
                      <Button size="$2" chromeless color="$gray10">
                        M
                      </Button>
                    </XStack>
                  </XStack>
                  <LineChart
                    data={chartData} // ✅ NOW USING LIVE STATE
                    width={SCREEN_WIDTH - 60}
                    height={180}
                    chartConfig={{
                      backgroundColor: Colors.card,
                      backgroundGradientFrom: Colors.card,
                      backgroundGradientTo: Colors.card,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(47, 128, 237, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(156, 163, 175, ${opacity})`,
                      propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: "#2F80ED",
                      },
                    }}
                    bezier
                    style={{ marginVertical: 8, borderRadius: 16 }}
                  />
                </YStack>

                {/* 4. User Management Section Header */}
                <YStack gap="$3" marginTop="$2">
                  <H3 color="white">Production Users</H3>

                  {/* Search Bar */}
                  <XStack
                    backgroundColor={Colors.card}
                    height={50}
                    borderRadius="$10"
                    alignItems="center"
                    paddingHorizontal="$3"
                    borderColor={Colors.cardBorder}
                    borderWidth={1}
                  >
                    <Feather name="search" size={20} color={Colors.textGray} />
                    <Input
                      flex={1}
                      backgroundColor="transparent"
                      borderWidth={0}
                      placeholder="Search by name, ID or locality..."
                      placeholderTextColor="$gray10"
                      color="white"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </XStack>

                  {/* Filter Tabs */}
                  <XStack gap="$2">
                    {["All", "Active", "Inactive"].map((tab) => (
                      <Button
                        key={tab}
                        size="$3"
                        backgroundColor={
                          filterTab === tab ? Colors.primary : "transparent"
                        }
                        borderColor={
                          filterTab === tab ? "transparent" : Colors.cardBorder
                        }
                        borderWidth={1}
                        borderRadius="$10"
                        onPress={() => setFilterTab(tab)}
                      >
                        <Text
                          color={filterTab === tab ? "white" : Colors.textGray}
                          fontWeight="600"
                        >
                          {tab}
                        </Text>
                      </Button>
                    ))}
                  </XStack>
                </YStack>
              </YStack>
            }
            data={filteredUsers}
            keyExtractor={(item: any) => item._id}
            renderItem={renderUser}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB (Floating Action Button) */}
        <Button
          position="absolute"
          // ✅ FIX 2: Raise it higher (Tab Bar is ~90px, so we use 110px)
          bottom={95}
          right={20}
          size="$6"
          circular
          backgroundColor={Colors.primary}
          elevation={10}
          pressStyle={{ scale: 0.95 }}
          onPress={openAddMode}
          icon={<Feather name="plus" size={28} color="white" />}
        />

        {/* ADD / EDIT USER SHEET */}
        <Sheet
          modal
          open={openSheet}
          onOpenChange={setOpenSheet}
          snapPoints={[85]}
          dismissOnSnapToBottom
        >
          <Sheet.Overlay />
          <Sheet.Frame padding="$4" gap="$3" backgroundColor={Colors.card}>
            <Sheet.Handle />
            <H3 color="white" textAlign="center" marginBottom="$4">
              {editingUser ? "Edit Profile" : "New User"}
            </H3>

            <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
              <Input
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                backgroundColor={Colors.background}
                color="white"
                borderColor={Colors.cardBorder}
                placeholderTextColor="$gray10"
                size="$4"
              />
              <Input
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                backgroundColor={Colors.background}
                color="white"
                borderColor={Colors.cardBorder}
                placeholderTextColor="$gray10"
                size="$4"
              />
              <Input
                placeholder="Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                backgroundColor={Colors.background}
                color="white"
                borderColor={Colors.cardBorder}
                placeholderTextColor="$gray10"
                size="$4"
              />
              <Input
                placeholder="Locality"
                value={locality}
                onChangeText={setLocality}
                backgroundColor={Colors.background}
                color="white"
                borderColor={Colors.cardBorder}
                placeholderTextColor="$gray10"
                size="$4"
              />

              <YStack>
                <Text color={Colors.textGray} fontSize={12} marginBottom="$1">
                  Price Rate (₹)
                </Text>
                <Input
                  placeholder="1.50"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  backgroundColor={Colors.background}
                  color="white"
                  borderColor={Colors.cardBorder}
                  placeholderTextColor="$gray10"
                  size="$4"
                />
              </YStack>

              <Input
                placeholder={
                  editingUser ? "New Password (Optional)" : "Password"
                }
                value={password}
                onChangeText={setPassword}
                backgroundColor={Colors.background}
                color="white"
                borderColor={Colors.cardBorder}
                placeholderTextColor="$gray10"
                size="$4"
                secureTextEntry
              />

              <XStack
                alignItems="center"
                justifyContent="space-between"
                backgroundColor={Colors.background}
                padding="$3"
                borderRadius="$4"
                borderColor={Colors.cardBorder}
                borderWidth={1}
              >
                <Text color={Colors.textGray}>Account Status</Text>
                <Button
                  size="$3"
                  backgroundColor={isActive ? Colors.success : Colors.danger}
                  onPress={() => setIsActive(!isActive)}
                >
                  <Text color={Colors.textGray} fontWeight="bold">
                    {isActive ? "Active" : "Inactive"}
                  </Text>
                </Button>
              </XStack>

              <Button
                backgroundColor={Colors.primary}
                size="$5"
                onPress={handleSaveUser}
                disabled={uploading}
                icon={uploading ? <Spinner color="white" /> : undefined}
              >
                <Text color={Colors.textGray} fontWeight="bold">
                  {editingUser ? "Update User" : "Create User"}
                </Text>
              </Button>
            </ScrollView>
          </Sheet.Frame>
        </Sheet>
      </YStack>
    </SafeAreaView>
  );
}
