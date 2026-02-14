import { Feather } from "@expo/vector-icons";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, H3, Progress, Text, YStack } from "tamagui";

// ⚠️ YOUR API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

export default function ServerAwakeScreen({
  onServerReady,
}: {
  onServerReady: () => void;
}) {
  const [status, setStatus] = useState("Connecting to server...");
  const [progress, setProgress] = useState(10);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    checkServer();
  }, []);

  const checkServer = async () => {
    try {
      setStatus("Waking up server (this may take a minute)...");

      // Simulate progress bar moving slowly while we wait
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 5 : prev));
      }, 1000);

      // Simple Ping - We try to fetch the root or a health endpoint
      // Adjust timeout to 60s because sleeping servers take time
      await axios.get(`${API_URL}/health`, { timeout: 60000 });

      clearInterval(interval);
      setProgress(100);
      setStatus("Connected! Launching app...");

      // Slight delay to show 100% completion
      setTimeout(onServerReady, 500);
    } catch (error) {
      console.error("Server Wake Error:", error);
      setStatus("Server is taking too long or is offline.");
      setRetries((r) => r + 1);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#0B0E14",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <YStack
        gap="$6"
        padding="$4"
        alignItems="center"
        width="100%"
        maxWidth={350}
      >
        {/* Icon */}
        <YStack
          width={100}
          height={100}
          backgroundColor="rgba(47, 128, 237, 0.1)"
          borderRadius="$10"
          justifyContent="center"
          alignItems="center"
          borderColor="#2F80ED"
          borderWidth={1}
        >
          <Feather name="server" size={40} color="#2F80ED" />
        </YStack>

        {/* Status Text */}
        <YStack alignItems="center" gap="$2">
          <H3 color="white" textAlign="center">
            Establishing Connection
          </H3>
          <Text color="#9CA3AF" textAlign="center" fontSize={14}>
            {status}
          </Text>
        </YStack>

        {/* Progress Bar */}
        <YStack width="100%" gap="$2">
          <Progress
            value={progress}
            backgroundColor="#151A23"
            borderColor="#232936"
            borderWidth={1}
          >
            <Progress.Indicator animation="bouncy" backgroundColor="#2F80ED" />
          </Progress>
          <Text color="#4B5563" fontSize={11} textAlign="right">
            {progress}%
          </Text>
        </YStack>

        {/* Retry Button (Only appears if it failed) */}
        {retries > 0 && (
          <Button
            onPress={() => {
              setRetries(0);
              setProgress(10);
              checkServer();
            }}
            icon={<Feather name="refresh-cw" size={16} color="white" />}
            backgroundColor="#2F80ED"
            color="white"
            marginTop="$4"
          >
            Retry Connection
          </Button>
        )}
      </YStack>
    </SafeAreaView>
  );
}
