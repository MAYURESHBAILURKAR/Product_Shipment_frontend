import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import { useFocusEffect, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import { Alert, Dimensions, FlatList } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  Card,
  H3,
  Spinner,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useAuth } from "../src/context/AuthContext";

// ⚠️ REPLACE IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";
const SCREEN_WIDTH = Dimensions.get("window").width;

// Nexus Colors
const Colors = {
  background: "#0B0E14",
  card: "#151A23",
  cardBorder: "#232936",
  primary: "#2F80ED",
  textGray: "#9CA3AF",
  success: "#00C851",
  accent: "#4CC9F0",
};

export default function AdminReportsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("monthly");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${API_URL}/shipments/reports?period=${period}`,
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );
      setReportData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [period]),
  );

  // --- PDF GENERATION LOGIC (Kept same, just functional) ---
  const generatePDF = async () => {
    if (reportData.length === 0) {
      Alert.alert("No Data", "Nothing to export.");
      return;
    }
    try {
      const rows = reportData
        .map(
          (item: any) => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.count}</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${item.totalQuantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; color: #2F80ED;">₹${item.totalAmount}</td>
        </tr>`,
        )
        .join("");

      const totalPayout = reportData.reduce(
        (acc: number, item: any) => acc + item.totalAmount,
        0,
      );

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
              h1 { color: #2F80ED; margin-bottom: 5px; }
              .header { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              th { text-align: left; background: #f8f9fa; padding: 12px; border-bottom: 2px solid #ddd; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
              .footer { margin-top: 40px; text-align: right; font-size: 20px; font-weight: bold; color: #333; }
            </style>
          </head>
          <body>
            <div class="header">
                <h1>Nexus Supply Report</h1>
                <p>Period: <strong>${period.toUpperCase()}</strong> • Generated: ${new Date().toLocaleDateString()}</p>
            </div>
            <table>
              <tr><th>Worker</th><th>Shipments</th><th>Total Qty</th><th>Earnings</th></tr>
              ${rows}
            </table>
            <div class="footer">Total Payout: ₹${totalPayout.toLocaleString()}</div>
          </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });
    } catch (error) {
      Alert.alert("Error", "Could not generate PDF");
    }
  };

  // --- CHART DATA PREP ---
  const chartLabels = reportData.map((item: any) => item.name.split(" ")[0]); // First name only
  const chartValues = reportData.map((item: any) => item.totalAmount);
  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ["No Data"],
    datasets: [{ data: chartValues.length > 0 ? chartValues : [0] }],
  };

  const renderRow = ({ item, index }: any) => (
    <Card
      backgroundColor={Colors.card}
      borderColor={Colors.cardBorder}
      borderWidth={1}
      borderRadius="$4"
      padding="$3"
      marginBottom="$3"
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack gap="$3" alignItems="center">
          <Text
            color={Colors.textGray}
            fontWeight="bold"
            fontSize={12}
            width={20}
          >
            #{index + 1}
          </Text>
          <Avatar circular size="$3">
            <Avatar.Image
              src={`https://ui-avatars.com/api/?name=${item.name}&background=random`}
            />
            <Avatar.Fallback backgroundColor={Colors.primary} />
          </Avatar>
          <YStack>
            <Text color="white" fontWeight="bold" fontSize={14}>
              {item.name}
            </Text>
            <Text color={Colors.textGray} fontSize={11}>
              {item.count} Shipments • {item.totalQuantity} Items
            </Text>
          </YStack>
        </XStack>

        <YStack alignItems="flex-end">
          <Text color={Colors.accent} fontWeight="bold" fontSize={14}>
            ₹ {item.totalAmount}
          </Text>
          <Text color={Colors.success} fontSize={10} fontWeight="600">
            PAID
          </Text>
        </YStack>
      </XStack>
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        contentContainerStyle={{ paddingBottom: 50 }}
        ListHeaderComponent={
          <YStack padding="$4" gap="$5">
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap="$3">
                <Button
                  chromeless
                  icon={<Feather name="arrow-left" size={24} color="white" />}
                  onPress={() => router.back()}
                  padding="$0"
                />
                <YStack>
                  <Text color={Colors.textGray} fontSize={10} letterSpacing={1}>
                    ANALYTICS
                  </Text>
                  <H3 color="white" fontWeight="bold">
                    Performance
                  </H3>
                </YStack>
              </XStack>
              <Button
                size="$3"
                backgroundColor={Colors.card}
                borderColor={Colors.cardBorder}
                borderWidth={1}
                icon={<Feather name="download" color={Colors.primary} />}
                onPress={generatePDF}
              >
                <Text color={Colors.primary} fontWeight="bold">
                  Export PDF
                </Text>
              </Button>
            </XStack>

            {/* Filter Tabs */}
            <XStack
              backgroundColor={Colors.card}
              padding="$1"
              borderRadius="$10"
              borderColor={Colors.cardBorder}
              borderWidth={1}
            >
              {["weekly", "monthly", "yearly"].map((p) => (
                <Button
                  key={p}
                  flex={1}
                  size="$3"
                  chromeless
                  borderRadius="$8"
                  backgroundColor={
                    period === p ? Colors.primary : "transparent"
                  }
                  onPress={() => setPeriod(p)}
                >
                  <Text
                    color={period === p ? "white" : Colors.textGray}
                    fontWeight="600"
                    textTransform="capitalize"
                  >
                    {p}
                  </Text>
                </Button>
              ))}
            </XStack>

            {/* Gradient Chart Card */}
            <LinearGradient
              colors={[Colors.card, "#1A2332"]}
              style={{
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: Colors.cardBorder,
              }}
            >
              <XStack justifyContent="space-between" marginBottom="$4">
                <H3 color="white" fontSize={16}>
                  Earnings Distribution
                </H3>
                <Feather name="bar-chart-2" color={Colors.accent} size={20} />
              </XStack>

              {loading ? (
                <YStack
                  height={220}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Spinner size="large" color={Colors.primary} />
                </YStack>
              ) : (
                <BarChart
                  data={chartData}
                  width={SCREEN_WIDTH - 64} // Padding compensation
                  height={220}
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: "transparent",
                    backgroundGradientFrom: "transparent",
                    backgroundGradientTo: "transparent",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(47, 128, 237, ${opacity})`, // Primary Blue
                    labelColor: (opacity = 1) =>
                      `rgba(156, 163, 175, ${opacity})`, // Gray
                    barPercentage: 0.7,
                    propsForBackgroundLines: {
                      strokeDasharray: "",
                      stroke: Colors.cardBorder,
                    }, // Subtle lines
                  }}
                  verticalLabelRotation={0}
                  showBarTops={false}
                  fromZero
                  flatColor={true}
                  withInnerLines={true}
                />
              )}
            </LinearGradient>

            {/* List Header */}
            <XStack
              justifyContent="space-between"
              alignItems="center"
              marginTop="$2"
            >
              <Text color={Colors.textGray} fontSize={12} letterSpacing={1}>
                TOP PERFORMERS
              </Text>
              {/* <Feather name="filter" size={16} color={Colors.textGray} /> */}
            </XStack>
          </YStack>
        }
        data={reportData}
        keyExtractor={(item: any) => item.name}
        renderItem={renderRow}
        ListEmptyComponent={
          !loading ? (
            <Text color={Colors.textGray} textAlign="center" marginTop="$10">
              No data found for this period.
            </Text>
          ) : null // <--- Returns null instead of false
        }
      />
    </SafeAreaView>
  );
}
