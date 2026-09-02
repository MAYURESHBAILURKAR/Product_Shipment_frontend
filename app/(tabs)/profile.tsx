import { AppVersionDisplay } from "@/components/AppVersionDisplay";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { ComponentProps, useEffect, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar as TAvatar,
  Input,
  Sheet,
  Switch,
  Text as TText,
} from "tamagui";
import {
  AppDialog,
  PressableScale,
  PrimaryButton,
  RupeeIcon,
  SectionHeader,
  StaggerItem,
  useDismissOnBack,
  useToast,
} from "../../src/components/ui";
import { palette, radius, spacing } from "../../src/theme/tokens";
import { useAuth } from "../../src/context/AuthContext";
import { isHapticsEnabled, setHapticsEnabled } from "../../src/utils/haptics";
import {
  isPushEnabled,
  registerForPush,
  setPushEnabled,
} from "../../src/utils/push";
import { LOCALE_LABELS, useLanguage } from "../../src/i18n/LanguageProvider";
import { getErrorMessage } from "../../src/utils/errors";
import type { Locale } from "../../src/i18n/translations";

// ⚠️ REPLACE IP
const API_URL = process.env.EXPO_PUBLIC_API_URL;

type FeatherName = ComponentProps<typeof Feather>["name"];

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const { showToast } = useToast();
  const { locale, setLocale, t } = useLanguage();
  const router = useRouter();
  const [openSheet, setOpenSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [languageSheet, setLanguageSheet] = useState(false);

  // Edit State
  const [name, setName] = useState<any>(user?.name || "");
  const [email, setEmail] = useState<any>(user?.email || "");
  const [mobile, setMobile] = useState<any>(user?.mobile || "");
  const [password, setPassword] = useState("");

  // Settings State
  const [notifications, setNotifications] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);

  useEffect(() => {
    setHapticsOn(isHapticsEnabled());
    setNotifications(isPushEnabled());
  }, []);

  // Push toggle: on → register this device immediately; off → skip
  // registration on future launches (backend keeps the last token).
  const handleNotificationsChange = (next: boolean) => {
    setNotifications(next);
    setPushEnabled(next);
    if (next && user) {
      registerForPush(user);
    }
  };

  useDismissOnBack(openSheet, () => setOpenSheet(false));
  useDismissOnBack(languageSheet, () => setLanguageSheet(false));

  // --- Update logic preserved exactly ---
  const handleUpdate = async () => {
    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/users/profile`,
        { name, email, mobile, password },
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        },
      );
      showToast({ message: t("profile.updated"), kind: "success" });
      setOpenSheet(false);
    } catch (error: any) {
      showToast({
        message: getErrorMessage(error, t, "common.updateFailed"),
        kind: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const MenuItem = ({
    icon,
    rupee = false,
    label,
    value,
    onPress,
    isDestructive = false,
  }: {
    icon: FeatherName;
    rupee?: boolean;
    label: string;
    value?: string;
    onPress: () => void;
    isDestructive?: boolean;
  }) => (
    <PressableScale hapticFeedback onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuLeft}>
        <View
          style={[
            styles.menuIcon,
            isDestructive && styles.menuIconDanger,
          ]}
        >
          {rupee ? (
            <RupeeIcon
              size={17}
              color={isDestructive ? palette.danger : palette.primaryBright}
            />
          ) : (
            <Feather
              name={icon}
              size={17}
              color={isDestructive ? palette.danger : palette.primaryBright}
            />
          )}
        </View>
        <Text
          style={[
            styles.menuLabel,
            isDestructive && { color: palette.danger },
          ]}
        >
          {label}
        </Text>
      </View>
      {value ? (
        <Text style={styles.menuValue}>{value}</Text>
      ) : (
        <Feather name="chevron-right" size={17} color={palette.textTertiary} />
      )}
    </PressableScale>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* 1. Header */}
        <StaggerItem index={0}>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View>
                <Avatar user={user} onPress={() => setOpenSheet(true)} />
              </View>
              <View style={{ alignItems: "center", marginTop: spacing.md }}>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{user?.role}</Text>
                </View>
                {user?.role === "production" && (
                  <View style={styles.rateBadge}>
                    <Text style={styles.rateText}>
                      ₹ {user?.priceAllotted}/unit
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </StaggerItem>

        {/* 2. Settings Groups */}
        <View style={styles.groupsWrap}>
          {/* Account */}
          <StaggerItem index={1}>
            <SectionHeader label={t("profile.account")} />
            <View style={styles.groupCard}>
              <MenuItem
                icon="user"
                label={t("profile.personalDetails")}
                onPress={() => setOpenSheet(true)}
              />
              <View style={styles.groupDivider} />
              <MenuItem
                icon="smartphone"
                label={t("profile.mobileNumber")}
                value={user?.mobile || t("profile.notSet")}
                onPress={() => setOpenSheet(true)}
              />
              {user?.role !== "admin" && (
                <>
                  <View style={styles.groupDivider} />
                  <MenuItem
                    icon="activity"
                    rupee
                    label={t("profile.myEarnings")}
                    value={t("profile.perUnit", {
                      rate: user?.priceAllotted || 0,
                    })}
                    onPress={() => router.push("/my-earnings")}
                  />
                </>
              )}
            </View>
          </StaggerItem>

          {/* Preferences */}
          <StaggerItem index={2}>
            <SectionHeader label={t("profile.preferences")} />
            <View style={styles.groupCard}>
              <View style={styles.prefRow}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIcon}>
                    <Feather name="bell" size={17} color={palette.primaryBright} />
                  </View>
                  <Text style={styles.menuLabel}>{t("profile.pushNotifications")}</Text>
                </View>
                <Switch
                  size="$2"
                  checked={notifications}
                  onCheckedChange={handleNotificationsChange}
                  backgroundColor={
                    notifications ? palette.primary : palette.border
                  }
                >
                  <Switch.Thumb backgroundColor="#FFFFFF" />
                </Switch>
              </View>
              <View style={styles.groupDivider} />
              <View style={styles.prefRow}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIcon}>
                    <Feather name="activity" size={17} color={palette.primaryBright} />
                  </View>
                  <Text style={styles.menuLabel}>{t("profile.hapticFeedback")}</Text>
                </View>
                <Switch
                  size="$2"
                  checked={hapticsOn}
                  onCheckedChange={(next: boolean) => {
                    setHapticsOn(next);
                    setHapticsEnabled(next);
                  }}
                  backgroundColor={hapticsOn ? palette.primary : palette.border}
                >
                  <Switch.Thumb backgroundColor="#FFFFFF" />
                </Switch>
              </View>
              <View style={styles.groupDivider} />
              <MenuItem
                icon="globe"
                label={t("profile.language")}
                value={LOCALE_LABELS[locale]}
                onPress={() => setLanguageSheet(true)}
              />
            </View>
          </StaggerItem>

          {/* Support */}
          <StaggerItem index={3}>
            <SectionHeader label={t("profile.support")} />
            <View style={styles.groupCard}>
              <MenuItem
                icon="help-circle"
                label={t("profile.helpSupport")}
                onPress={() => Linking.openURL("mailto:support@masalaflow.com")}
              />
              <View style={styles.groupDivider} />
              <MenuItem
                icon="log-out"
                label={t("profile.logOut")}
                isDestructive
                onPress={() => setLogoutDialog(true)}
              />
            </View>
          </StaggerItem>

          <AppVersionDisplay marginTop="$4" />
        </View>
      </ScrollView>

      {/* Edit Profile Sheet */}
      <Sheet
        modal
        open={openSheet}
        onOpenChange={setOpenSheet}
        snapPoints={[65]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" gap="$4" backgroundColor={palette.surfaceElevated}>
          <Sheet.Handle />
          <TText color={palette.text} fontSize={20} fontWeight="700" textAlign="center">
            {t("profile.editProfile")}
          </TText>

          <View style={{ gap: spacing.md }}>
            <Input
              value={name}
              onChangeText={setName}
              placeholder={t("profile.fullName")}
              backgroundColor={palette.surfaceHighest}
              color={palette.text}
              borderColor={palette.border}
              placeholderTextColor="$gray10"
            />
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder={t("profile.emailAddress")}
              backgroundColor={palette.surfaceHighest}
              color={palette.text}
              borderColor={palette.border}
              placeholderTextColor="$gray10"
              keyboardType="email-address"
            />
            <Input
              value={mobile}
              onChangeText={setMobile}
              placeholder={t("profile.mobileNumber")}
              backgroundColor={palette.surfaceHighest}
              color={palette.text}
              borderColor={palette.border}
              placeholderTextColor="$gray10"
              keyboardType="phone-pad"
            />
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder={t("profile.newPassword")}
              backgroundColor={palette.surfaceHighest}
              color={palette.text}
              borderColor={palette.border}
              placeholderTextColor="$gray10"
              secureTextEntry
            />
          </View>

          <PrimaryButton
            label={loading ? t("common.saving") : t("profile.saveChanges")}
            loading={loading}
            onPress={handleUpdate}
          />
        </Sheet.Frame>
      </Sheet>

      {/* Language Sheet */}
      <Sheet
        modal
        open={languageSheet}
        onOpenChange={setLanguageSheet}
        snapPoints={[40]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" gap="$4" backgroundColor={palette.surfaceElevated}>
          <Sheet.Handle />
          <TText color={palette.text} fontSize={20} fontWeight="700" textAlign="center">
            {t("profile.language")}
          </TText>

          <View style={{ gap: spacing.sm }}>
            {(Object.keys(LOCALE_LABELS) as Locale[]).map((code) => (
              <PressableScale
                key={code}
                hapticFeedback
                onPress={() => {
                  setLocale(code);
                  setLanguageSheet(false);
                }}
                style={[
                  styles.langRow,
                  locale === code && styles.langRowActive,
                ]}
              >
                <Text
                  style={[
                    styles.langLabel,
                    locale === code && { color: palette.primaryBright },
                  ]}
                >
                  {LOCALE_LABELS[code]}
                </Text>
                {locale === code && (
                  <Feather
                    name="check"
                    size={18}
                    color={palette.primaryBright}
                  />
                )}
              </PressableScale>
            ))}
          </View>
        </Sheet.Frame>
      </Sheet>

      {/* Logout confirm */}
      <AppDialog
        visible={logoutDialog}
        title={t("profile.logOutTitle")}
        message={t("profile.logOutMessage")}
        kind="danger"
        icon="log-out"
        buttons={[
          {
            label: t("common.cancel"),
            style: "cancel",
            onPress: () => setLogoutDialog(false),
          },
          { label: t("profile.logOut"), style: "danger", onPress: logout },
        ]}
      />
    </SafeAreaView>
  );
}

// Avatar with edit overlay
function Avatar({ user, onPress }: { user: any; onPress: () => void }) {
  return (
    <View style={avatarStyles.wrap}>
      <AvatarMain name={user?.name} />
      <PressableScale
        onPress={onPress}
        hapticFeedback
        style={avatarStyles.editBtn}
      >
        <Feather name="edit-2" size={14} color={palette.text} />
      </PressableScale>
    </View>
  );
}

function AvatarMain({ name }: { name?: string }) {
  return (
    <TAvatar circular size="$10">
      <TAvatar.Image
        src={`https://ui-avatars.com/api/?name=${name}&background=2F80ED&color=fff&size=128`}
      />
      <TAvatar.Fallback backgroundColor={palette.primary} />
    </TAvatar>
  );
}

const avatarStyles = StyleSheet.create({
  wrap: { position: "relative" },
  editBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: palette.surfaceHighest,
    borderRadius: radius.pill,
    padding: 7,
    borderWidth: 2,
    borderColor: palette.background,
  },
});

const styles = StyleSheet.create({
  hero: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  heroTop: { alignItems: "center", width: "100%" },
  userName: {
    color: palette.text,
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  userEmail: {
    color: palette.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  roleBadge: {
    backgroundColor: palette.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${palette.primary}33`,
  },
  roleText: {
    color: palette.primaryBright,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rateBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderColor: palette.success,
    borderWidth: 1,
  },
  rateText: {
    color: palette.success,
    fontSize: 11,
    fontWeight: "700",
  },
  groupsWrap: { padding: spacing.lg, gap: spacing.lg },
  groupCard: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderColor: palette.border,
    borderWidth: 1,
  },
  groupDivider: { height: 1, backgroundColor: palette.border, marginVertical: 4 },
  menuRow: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  menuLeft: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: palette.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconDanger: { backgroundColor: "rgba(248, 113, 113, 0.12)" },
  menuLabel: { color: palette.text, fontSize: 15, fontWeight: "500" },
  menuValue: { color: palette.textSecondary, fontSize: 14 },
  prefRow: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceHighest,
  },
  langRowActive: {
    borderColor: palette.primaryBright,
    backgroundColor: palette.primarySoft,
  },
  langLabel: { color: palette.text, fontSize: 16, fontWeight: "600" },
});
