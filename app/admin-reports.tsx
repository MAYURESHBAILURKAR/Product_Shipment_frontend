import { Feather } from "@expo/vector-icons";
import axios from "axios";
import * as Print from "expo-print";
import { useFocusEffect, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "tamagui";
import {
  EmptyState,
  PressableScale,
  ScreenHeader,
  SectionHeader,
  StaggerItem,
} from "../src/components/ui";
import { palette, radius, spacing } from "../src/theme/tokens";
import { useAuth } from "../src/context/AuthContext";

// ⚠️ REPLACE IP
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function AdminReportsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("monthly");

  // --- Fetch logic preserved exactly ---
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

  // --- PDF GENERATION LOGIC (preserved exactly) ---
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

  // --- Chart data prep preserved exactly ---
  const chartLabels = reportData.map((item: any) => item.name.split(" ")[0]);
  const chartValues = reportData.map((item: any) => item.totalAmount);
  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ["No Data"],
    datasets: [{ data: chartValues.length > 0 ? chartValues : [0] }],
  };

  const totalEarnings = useMemo(
    () =>
      reportData.reduce(
        (acc: number, item: any) => acc + item.totalAmount,
        0,
      ),
    [reportData],
  );

  const renderRow = ({ item, index }: any) => (
    <StaggerItem index={index} travelY={10}>
      <View style={styles.rowCard}>
        <View style={styles.rowLeft}>
          <Text style={styles.rank}>#{index + 1}</Text>
          <Avatar circular size="$3">
            <Avatar.Image
              src={`https://ui-avatars.com/api/?name=${item.name}&background=random`}
            />
            <Avatar.Fallback backgroundColor={palette.primary} />
          </Avatar>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{item.name}</Text>
            <Text style={styles.rowMeta}>
              {item.count} Shipments • {item.totalQuantity} Items
            </Text>
          </View>
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.rowAmount}>₹ {item.totalAmount}</Text>
          <Text style={styles.rowPaid}>PAID</Text>
        </View>
      </View>
    </StaggerItem>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <FlatList
        contentContainerStyle={{ paddingBottom: 50 }}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* Header */}
            <ScreenHeader
              title="Performance"
              subtitle="ANALYTICS"
              onBack={() => router.back()}
              right={
                <PressableScale
                  hapticFeedback
                  onPress={generatePDF}
                  style={styles.exportBtn}
                >
                  <Feather name="download" size={14} color={palette.primaryBright} />
                  <Text style={styles.exportText}>Export PDF</Text>
                </PressableScale>
              }
            />

            {/* Period Filter */}
            <StaggerItem index={1}>
              <View style={styles.segmentWrap}>
                {["weekly", "monthly", "yearly"].map((p) => (
                  <PressableScale
                    key={p}
                    hapticFeedback
                    onPress={() => setPeriod(p)}
                    style={[
                      styles.segment,
                      period === p && styles.segmentActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        period === p && styles.segmentTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </StaggerItem>

            {/* Chart Card */}
            <StaggerItem index={2}>
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Earnings Distribution</Text>
                  <Feather name="bar-chart-2" color={palette.accent} size={19} />
                </View>

                {loading ? (
                  <View style={styles.chartLoader}>
                    <View style={styles.chartSkeleton} />
                  </View>
                ) : (
                  <BarChart
                    data={chartData}
                    width={SCREEN_WIDTH - 64}
                    height={220}
                    yAxisLabel="₹"
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: "transparent",
                      backgroundGradientFrom: "transparent",
                      backgroundGradientTo: "transparent",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(90, 164, 245, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(139, 148, 167, ${opacity})`,
                      barPercentage: 0.7,
                      propsForBackgroundLines: {
                        strokeDasharray: "",
                        stroke: palette.border,
                      },
                    }}
                    verticalLabelRotation={0}
                    showBarTops={false}
                    fromZero
                    flatColor={true}
                    withInnerLines={true}
                  />
                )}
                <Text style={styles.totalLine}>
                  Total: ₹{totalEarnings.toLocaleString()}
                </Text>
              </View>
            </StaggerItem>

            {/* List Header */}
            <StaggerItem index={3}>
              <SectionHeader label="Top Performers" />
            </StaggerItem>
          </View>
        }
        data={reportData}
        keyExtractor={(item: any) => item.name}
        renderItem={renderRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="bar-chart-2"
              title="No data found"
              message="There's no performance data for this period yet."
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: `${palette.primary}33`,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  exportText: { color: palette.primaryBright, fontWeight: "700", fontSize: 13 },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: palette.surfaceElevated,
    padding: 4,
    borderRadius: radius.pill,
    borderColor: palette.border,
    borderWidth: 1,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: palette.primary },
  segmentText: {
    color: palette.textSecondary,
    fontWeight: "600",
    fontSize: 13,
    textTransform: "capitalize",
  },
  segmentTextActive: { color: "#FFFFFF" },
  chartCard: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  chartTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  chartLoader: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  chartSkeleton: {
    width: "90%",
    height: 200,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceHighest,
  },
  totalLine: {
    color: palette.textSecondary,
    fontSize: 12,
    textAlign: "right",
    marginTop: spacing.sm,
  },
  rowCard: {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  rank: {
    color: palette.textTertiary,
    fontWeight: "700",
    fontSize: 12,
    width: 22,
  },
  rowName: { color: palette.text, fontWeight: "700", fontSize: 14 },
  rowMeta: { color: palette.textSecondary, fontSize: 11, marginTop: 2 },
  rowRight: { alignItems: "flex-end" },
  rowAmount: { color: palette.accent, fontWeight: "700", fontSize: 14 },
  rowPaid: { color: palette.success, fontSize: 10, fontWeight: "700", marginTop: 2 },
});
