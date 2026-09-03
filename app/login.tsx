import { AppVersionDisplay } from "@/components/AppVersionDisplay";
import { Logo } from "@/components/Logo";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  FastInput,
  GlassCard,
  PressableScale,
  PrimaryButton,
  StaggerItem,
  useToast,
} from "../src/components/ui";
import { palette, radius, spacing } from "../src/theme/tokens";
import { useAuth } from "../src/context/AuthContext";
import { useLanguage } from "../src/i18n/LanguageProvider";
import { getErrorMessage } from "../src/utils/errors";

// ⚠️ REPLACE WITH YOUR LOCAL IP
const API_URL = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/auth/login`
  : "http://localhost:8080/api/auth/login";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  // Text lives in a ref (FastInput pattern): typing never re-renders the
  // screen; the login handler reads the ref directly.
  const form = useRef({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Login logic preserved exactly ---
  const handleLogin = async () => {
    const { email, password } = form.current;
    if (!email || !password) {
      showToast({ message: t("auth.fillAllFields"), kind: "error" });
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(API_URL, { email, password });
      await login(data);
    } catch (error: any) {
      console.error(error);
      showToast({
        message: getErrorMessage(error, t, "auth.checkConnection"),
        kind: "error",
      });
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
          <StaggerItem index={0} style={styles.header}>
            <Logo size={80} showText={true} />
            <Text style={styles.tagline}>{t("auth.tagline")}</Text>
          </StaggerItem>

          {/* Form Card */}
          <StaggerItem index={1} style={styles.formWrap}>
            <GlassCard padding={24}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>{t("auth.welcomeBack")}</Text>
                <Text style={styles.formSubtitle}>{t("auth.subtitle")}</Text>
              </View>

              {/* Email Input */}
              <View style={styles.field}>
                <Text style={styles.label}>{t("auth.email")}</Text>
                <View style={styles.inputWrap}>
                  <Feather name="mail" size={17} color={palette.textTertiary} />
                  <FastInput
                    flex={1}
                    value=""
                    onChangeText={(text) => (form.current.email = text)}
                    placeholder="admin@nexus-supply.com"
                    placeholderTextColor="$gray9"
                    backgroundColor="transparent"
                    borderWidth={0}
                    color={palette.text}
                    autoCapitalize="none"
                    fontSize={14}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.field}>
                <Text style={styles.label}>{t("auth.password")}</Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={17} color={palette.textTertiary} />
                  <FastInput
                    flex={1}
                    value=""
                    onChangeText={(text) => (form.current.password = text)}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••••••"
                    placeholderTextColor="$gray9"
                    backgroundColor="transparent"
                    borderWidth={0}
                    color={palette.text}
                    fontSize={14}
                  />
                  <PressableScale
                    hapticFeedback
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={17}
                      color={palette.textTertiary}
                    />
                  </PressableScale>
                </View>
              </View>

              {/* Forgot Row */}
              <PressableScale
                hapticFeedback
                onPress={() => router.push("/forgot-password")}
                style={styles.forgotWrap}
              >
                <Text style={styles.forgot}>{t("auth.forgot")}</Text>
              </PressableScale>

              {/* Login Button */}
              <PrimaryButton
                label={t("auth.signIn")}
                icon={loading ? undefined : "arrow-right"}
                loading={loading}
                size="lg"
                onPress={handleLogin}
              />
            </GlassCard>
          </StaggerItem>

          {/* Footer */}
          <StaggerItem index={2} style={styles.footer}>
            <AppVersionDisplay />
            <View style={styles.legalRow}>
              <Text style={styles.legal}>{t("auth.privacy")}</Text>
              <Text style={styles.legalDot}>•</Text>
              <Text style={styles.legal}>{t("auth.terms")}</Text>
              <Text style={styles.legalDot}>•</Text>
              <Text style={styles.legal}>{t("auth.help")}</Text>
            </View>
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
    marginBottom: spacing.xxl,
  },
  tagline: {
    color: palette.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
    letterSpacing: 0.3,
  },
  formWrap: { width: "100%" },
  formHeader: { marginBottom: spacing.xl, gap: 6 },
  formTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  formSubtitle: {
    color: palette.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
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
  forgotWrap: { alignSelf: "flex-end", paddingVertical: spacing.xs },
  forgot: {
    color: palette.primaryBright,
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  legalRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  legal: { color: palette.textTertiary, fontSize: 12 },
  legalDot: { color: palette.textTertiary, fontSize: 12 },
});
