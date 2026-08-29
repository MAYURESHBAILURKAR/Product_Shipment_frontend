import { Feather } from "@expo/vector-icons";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, radius, spacing } from "./src/theme/tokens";
import { PrimaryButton } from "./src/components/ui/PrimaryButton";
import { StaggerItem } from "./src/components/ui/StaggerItem";

// ⚠️ YOUR API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";

// Breathing pulse ring around the server icon.
function PulseIcon() {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400 }),
        withTiming(0, { duration: 1400 }),
      ),
      -1,
      false,
    );
  }, [glow]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - glow.value),
    transform: [{ scale: 1 + glow.value * 0.45 }],
  }));

  return (
    <View style={styles.iconOuter}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.ring,
          ringStyle,
        ]}
      />
      <View style={styles.iconInner}>
        <Feather name="server" size={40} color={palette.primaryBright} />
      </View>
    </View>
  );
}

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

  // --- Ping/retry logic preserved exactly ---
  const checkServer = async () => {
    try {
      setStatus("Waking up server (this may take a minute)...");

      const interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 5 : prev));
      }, 1000);

      await axios.get(`${API_URL}/health`, { timeout: 60000 });

      clearInterval(interval);
      setProgress(100);
      setStatus("Connected! Launching app...");

      setTimeout(onServerReady, 500);
    } catch (error) {
      console.error("Server Wake Error:", error);
      setStatus("Server is taking too long or is offline.");
      setRetries((r) => r + 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <StaggerItem>
          <PulseIcon />
        </StaggerItem>

        <StaggerItem index={1}>
          <View style={styles.statusText}>
            <Text style={styles.heading}>Establishing Connection</Text>
            <Text style={styles.status}>{status}</Text>
          </View>
        </StaggerItem>

        <StaggerItem index={2} style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <AnimatedProgress value={progress} />
          </View>
          <Text style={styles.percent}>{progress}%</Text>
        </StaggerItem>

        {retries > 0 && (
          <StaggerItem index={3} style={styles.retryWrap}>
            <PrimaryButton
              label="Retry Connection"
              icon="refresh-cw"
              variant="ghost"
              onPress={() => {
                setRetries(0);
                setProgress(10);
                checkServer();
              }}
            />
          </StaggerItem>
        )}
      </View>
    </SafeAreaView>
  );
}

// Smooth reanimated progress fill instead of jumping Tamagui Progress.
function AnimatedProgress({ value }: { value: number }) {
  const width = useSharedValue(0.1);

  useEffect(() => {
    width.value = withDelay(
      150,
      withSpring(value / 100, { damping: 20, stiffness: 90 }),
    );
  }, [value, width]);

  const style = useAnimatedStyle(() => ({
    width: `${Math.max(width.value, 0) * 100}%`,
    borderRadius: radius.pill,
  }));

  return <Animated.View style={[styles.progressFill, style]} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  iconOuter: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  iconInner: {
    width: 100,
    height: 100,
    backgroundColor: palette.primarySoft,
    borderRadius: radius.xl,
    justifyContent: "center",
    alignItems: "center",
    borderColor: palette.primary,
    borderWidth: 1,
  },
  ring: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: palette.primary,
  },
  statusText: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  heading: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  status: {
    color: palette.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  progressWrap: {
    width: "100%",
    maxWidth: 320,
    gap: spacing.xs,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.primary,
  },
  percent: {
    color: palette.textTertiary,
    fontSize: 11,
    textAlign: "right",
  },
  retryWrap: {
    width: "100%",
    maxWidth: 320,
    marginTop: spacing.lg,
  },
});
