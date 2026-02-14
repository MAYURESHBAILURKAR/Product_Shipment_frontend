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
    TouchableOpacity,
} from "react-native";
import { Button, H3, Input, Spinner, Text, XStack, YStack } from "tamagui";

// ⚠️ Ensure this matches your .env or fallback
const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.29.48:8080/api";

// Nexus Colors
const Colors = {
  background: "#0B0E14",
  card: "#151A23",
  inputBg: "#1C222E",
  border: "#232936",
  primary: "#2F80ED",
  text: "#FFFFFF",
  textGray: "#9CA3AF",
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      style={{ flex: 1, backgroundColor: Colors.background }}
    >
      <LinearGradient
        colors={[Colors.background, "#111620", "#0f1219"]}
        style={{ flex: 1, justifyContent: "center", padding: 20 }}
      >
        <YStack gap="$6" maxWidth={400} width="100%" alignSelf="center">
          {/* Header */}
          <YStack alignItems="center" marginBottom="$4">
            <Logo size={60} showText={false} />
            <H3 color="white" marginTop="$4">
              Reset Password
            </H3>
            <Text color={Colors.textGray} textAlign="center" fontSize={14}>
              Enter your email and new password.
            </Text>
          </YStack>

          {/* Form Card */}
          <YStack
            backgroundColor={Colors.card}
            borderColor={Colors.border}
            borderWidth={1}
            borderRadius="$6"
            padding="$5"
            gap="$4"
          >
            {/* Email Input */}
            <YStack gap="$2">
              <Text
                color={Colors.textGray}
                fontSize={11}
                fontWeight="bold"
                letterSpacing={1}
              >
                EMAIL ADDRESS
              </Text>
              <XStack
                backgroundColor={Colors.inputBg}
                borderColor={Colors.border}
                borderWidth={1}
                borderRadius="$4"
                alignItems="center"
                paddingHorizontal="$3"
                height={50}
              >
                <Feather name="mail" size={18} color={Colors.textGray} />
                <Input
                  flex={1}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="admin@nexus-supply.com"
                  placeholderTextColor="$gray9"
                  backgroundColor="transparent"
                  borderWidth={0}
                  color="white"
                  autoCapitalize="none"
                />
              </XStack>
            </YStack>

            {/* New Password Input */}
            <YStack gap="$2">
              <Text
                color={Colors.textGray}
                fontSize={11}
                fontWeight="bold"
                letterSpacing={1}
              >
                NEW PASSWORD
              </Text>
              <XStack
                backgroundColor={Colors.inputBg}
                borderColor={Colors.border}
                borderWidth={1}
                borderRadius="$4"
                alignItems="center"
                paddingHorizontal="$3"
                height={50}
              >
                <Feather name="lock" size={18} color={Colors.textGray} />
                <Input
                  flex={1}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="••••••••••••"
                  placeholderTextColor="$gray9"
                  backgroundColor="transparent"
                  borderWidth={0}
                  color="white"
                />
              </XStack>
            </YStack>

            {/* Submit Button */}
            <Button
              backgroundColor={Colors.primary}
              height={50}
              borderRadius="$4"
              onPress={handleReset}
              disabled={loading}
              marginTop="$2"
              icon={loading ? <Spinner color="white" /> : undefined}
            >
              <Text color="white" fontWeight="bold" fontSize={16}>
                Reset Password
              </Text>
            </Button>
          </YStack>

          {/* Back to Login */}
          <TouchableOpacity onPress={() => router.back()}>
            <Text color={Colors.textGray} textAlign="center" fontSize={14}>
              <Feather name="arrow-left" /> Back to Login
            </Text>
          </TouchableOpacity>
        </YStack>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
