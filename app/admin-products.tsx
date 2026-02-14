import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, Image as RNImage } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  H2,
  H3,
  Input,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useAuth } from "../src/context/AuthContext";

// ⚠️ REPLACE WITH YOUR IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

export default function AdminProductsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/products/admin/all`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, []),
  );

  // Filter products by search
  const filteredProducts = products.filter(
    (p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.name.toLowerCase().includes(search.toLowerCase()),
  );

  const renderProduct = ({ item }: any) => (
    <Card
      borderColor="$borderColor"
      borderWidth={1}
      padding="$0"
      marginBottom="$3"
      backgroundColor="#1a1a2e"
      overflow="hidden"
    >
      <XStack>
        <RNImage
          source={{ uri: item.photoUrl || "https://via.placeholder.com/100" }}
          style={{ width: 100, height: "100%" }}
        />
        <YStack padding="$3" flex={1}>
          <H3 fontSize={16} color="white">
            {item.name}
          </H3>
          <Text color="$gray10" fontSize={12} marginBottom="$2">
            {item.brand}
          </Text>

          {/* Owner Details */}
          <XStack
            backgroundColor="rgba(255,255,255,0.05)"
            padding="$2"
            borderRadius="$4"
            marginBottom="$2"
          >
            <Feather
              name="user"
              size={14}
              color="#4CC9F0"
              style={{ marginRight: 6 }}
            />
            <Text color="#4CC9F0" fontSize={12} fontWeight="bold">
              {item.user?.name}
              <Text color="$gray10" fontWeight="normal">
                {" "}
                ({item.user?.locality || "No Locality"})
              </Text>
            </Text>
          </XStack>

          <XStack alignItems="center" gap="$2">
            <Feather name="box" size={14} color="#FF6B6B" />
            <Text color="#FF6B6B" fontWeight="bold">
              {item.currentStock} in stock
            </Text>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f0c29" }}>
      <YStack padding="$4" flex={1}>
        <XStack alignItems="center" gap="$3" marginBottom="$4">
          <Button
            chromeless
            icon={<Feather name="arrow-left" size={24} />}
            onPress={() => router.back()}
          />
          <H2 color="white">Global Inventory</H2>
        </XStack>

        {/* Search Bar */}
        <Input
          flex={1}
          placeholder="Search by Product or User..."
          value={search}
          onChangeText={setSearch}
          backgroundColor="transparent"
          borderWidth={0}
          color="white"
          placeholderTextColor="$gray9"
        />

        {loading ? (
          <Spinner size="large" color="#FF6B6B" />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item: any) => item._id}
            renderItem={renderProduct}
            contentContainerStyle={{ paddingBottom: 50 }}
          />
        )}
      </YStack>
    </SafeAreaView>
  );
}
