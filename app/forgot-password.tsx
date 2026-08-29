import { Logo } from "@/components/Logo";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  GlassCard,
  PressableScale,
  PrimaryButton,
  StaggerItem,
} from "../src/components/ui";
import { palette, radius, spacing } from "../src/theme/tokens";
import { Input } from "tamagui";

// ⚠️ Ensure this matches your .env or fallback
const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.29.48:8080/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Reset logic preserved exactly ---
  const handleReset = async () => {
    if (!email || !newPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        email,
        newPassword,
      });

      Alert.alert("Success", "Password has been reset! Please login.");
      router.back(); // Go back to Login
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: palette.background }}
    >
      <LinearGradient
        colors={[palette.background, "#0C1220", "#0A0E16"]}
        style={styles.gradient}
      >
        <View style={styles.center}>
          {/* Header */}
          <StaggerItem style={styles.header}>
            <Logo size={60} showText={false} />
            <Text style={styles.heading}>Reset Password</Text>
            <Text style={styles.subheading}>
              Enter your email and new password.
            </Text>
          </StaggerItem>

          {/* Form Card */}
          <StaggerItem index={1}>
            <GlassCard padding={24}>
              {/* Email Input */}
              <View style={styles.field}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrap}>
                  <Feather name="mail" size={17} color={palette.textTertiary} />
                  <Input
                    flex={1}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="admin@nexus-supply.com"
                    placeholderTextColor="$gray9"
                    backgroundColor="transparent"
                    borderWidth={0}
                    color={palette.text}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* New Password Input */}
              <View style={styles.field}>
                <Text style={styles.label}>NEW PASSWORD</Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={17} color={palette.textTertiary} />
                  <Input
                    flex={1}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="••••••••••••"
                    placeholderTextColor="$gray9"
                    backgroundColor="transparent"
                    borderWidth={0}
                    color={palette.text}
                  />
                </View>
              </View>

              {/* Submit */}
              <PrimaryButton
                label="Reset Password"
                loading={loading}
                size="lg"
                onPress={handleReset}
              />
            </GlassCard>
          </StaggerItem>

          {/* Back to Login */}
          <StaggerItem index={2} style={styles.backWrap}>
            <PressableScale hapticFeedback onPress={() => router.back()}>
              <View style={styles.backRow}>
                <Feather name="arrow-left" size={16} color={palette.textSecondary} />
                <Text style={styles.back}>Back to Login</Text>
              </View>
            </PressableScale>
          </StaggerItem>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, justifyContent: "center", padding: 20 },
  center: { maxWidth: 400, width: "100%", alignSelf: "center" },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  heading: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: spacing.md,
  },
  subheading: {
    color: palette.textSecondary,
    textAlign: "center",
    fontSize: 14,
  },
  field: { marginBottom: spacing.lg, gap: 8 },
  label: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  inputWrap: {
    backgroundColor: palette.surfaceHighest,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    height: 50,
    gap: spacing.sm,
  },
  backWrap: { alignItems: "center", marginTop: spacing.xl },
  backRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  back: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
});
