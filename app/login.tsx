import { AppVersionDisplay } from "@/components/AppVersionDisplay";
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
import { useAuth } from "../src/context/AuthContext";

// ⚠️ REPLACE WITH YOUR LOCAL IP
const API_URL = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/auth/login`
  : "http://localhost:8080/api/auth/login";

// Nexus Color Palette
const Colors = {
  background: "#0B0E14",
  card: "#151A23",
  inputBg: "#1C222E",
  border: "#232936",
  primary: "#2F80ED",
  text: "#FFFFFF",
  textGray: "#9CA3AF",
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(API_URL, { email, password });
      await login(data);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "Check connection",
      );
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: Colors.background }}
    >
      {/* Background Gradient for subtle depth */}
      <LinearGradient
        colors={[Colors.background, "#111620", "#0f1219"]}
        style={{ flex: 1, justifyContent: "center", padding: 20 }}
      >
        <YStack gap="$6" maxWidth={400} width="100%" alignSelf="center">
          {/* ✅ 1. Header Section - Updated with Logo Component */}
          <YStack alignItems="center" marginBottom="$4">
            <Logo size={80} showText={true} />
            <Text color={Colors.textGray} fontSize={14} marginTop="$2">
              Enterprise logistics management
            </Text>
          </YStack>

          {/* 2. Login Form Card */}
          <YStack
            backgroundColor={Colors.card}
            borderColor={Colors.border}
            borderWidth={1}
            borderRadius="$6"
            padding="$5"
            gap="$4"
            elevation={10} // Android shadow
            shadowColor="black"
            shadowOpacity={0.3}
            shadowRadius={10} // iOS shadow
          >
            <YStack gap="$2">
              <H3 color="white" fontSize={20} fontWeight="600">
                Welcome Back
              </H3>
              <Text color={Colors.textGray} fontSize={14}>
                Please enter your credentials to access the dashboard.
              </Text>
            </YStack>

            {/* Email Input */}
            <YStack gap="$2" marginTop="$2">
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
                  fontSize={14}
                />
              </XStack>
            </YStack>

            {/* Password Input */}
            <YStack gap="$2">
              <Text
                color={Colors.textGray}
                fontSize={11}
                fontWeight="bold"
                letterSpacing={1}
              >
                PASSWORD
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
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••••••"
                  placeholderTextColor="$gray9"
                  backgroundColor="transparent"
                  borderWidth={0}
                  color="white"
                  fontSize={14}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={18}
                    color={Colors.textGray}
                  />
                </TouchableOpacity>
              </XStack>
            </YStack>

            {/* Remember / Forgot Row */}
            <XStack
              justifyContent="flex-end"
              alignItems="center"
              marginTop="$1"
            >
              <TouchableOpacity onPress={() => router.push("/forgot-password")}>
                {" "}
                {/* ✅ Update this */}
                <Text color={Colors.primary} fontSize={13} fontWeight="600">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </XStack>

            {/* Login Button */}
            <Button
              backgroundColor={Colors.primary}
              height={50}
              borderRadius="$4"
              pressStyle={{ opacity: 0.9 }}
              marginTop="$2"
              onPress={handleLogin}
              disabled={loading}
              icon={loading ? <Spinner color="white" /> : undefined}
            >
              <Text color="white" fontWeight="bold" fontSize={16}>
                Sign In
              </Text>
              {!loading && (
                <Feather name="arrow-right" size={18} color="white" />
              )}
            </Button>
          </YStack>

          {/* Footer */}
          <YStack alignItems="center" gap="$1" marginTop="$4">
            <AppVersionDisplay />

            <XStack gap="$3" marginTop="$2">
              <Text color="#4B5563" fontSize={12}>
                Privacy
              </Text>
              <Text color="#4B5563" fontSize={12}>
                Terms
              </Text>
              <Text color="#4B5563" fontSize={12}>
                Help
              </Text>
            </XStack>
          </YStack>
        </YStack>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
