import { AppVersionDisplay } from "@/components/AppVersionDisplay";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  H3,
  Input,
  Separator,
  Sheet,
  Spinner,
  Switch,
  Text,
  XStack,
  YStack,
} from "tamagui";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

// ⚠️ REPLACE IP
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Nexus Colors
// const Colors = {
//   background: "#0B0E14",
//   card: "#151A23",
//   cardBorder: "#232936",
//   primary: "#2F80ED",
//   text: "#9CA3AF",
//   success: "#00C851",
//   danger: "#FF4444",
// };

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const [openSheet, setOpenSheet] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit State
  const [name, setName] = useState<any>(user?.name || "");
  const [email, setEmail] = useState<any>(user?.email || "");
  const [mobile, setMobile] = useState<any>(user?.mobile || "");
  const [password, setPassword] = useState("");
  const { theme, toggleTheme, Colors } = useTheme();

  // Mock Settings State
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

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
      Alert.alert("Success", "Profile Updated");
      setOpenSheet(false);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const MenuItem = ({
    icon,
    label,
    value,
    onPress,
    isDestructive = false,
  }: any) => (
    <TouchableOpacity onPress={onPress}>
      <XStack
        paddingVertical="$3"
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack gap="$3" alignItems="center">
          <YStack
            width={36}
            height={36}
            borderRadius="$4"
            backgroundColor={
              isDestructive ? "rgba(255, 68, 68, 0.1)" : Colors.card
            }
            justifyContent="center"
            alignItems="center"
          >
            <Feather
              name={icon}
              size={18}
              color={isDestructive ? Colors.danger : Colors.primary}
            />
          </YStack>
          <Text
            color={isDestructive ? Colors.danger : Colors.text}
            fontSize={16}
          >
            {label}
          </Text>
        </XStack>
        {value ? (
          <Text color={Colors.text}>{value}</Text>
        ) : (
          <Feather name="chevron-right" size={18} color={Colors.text} />
        )}
      </XStack>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* 1. Header Section */}
        <LinearGradient
          colors={[Colors.card, Colors.background]}
          style={{
            padding: 20,
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: Colors.cardBorder,
          }}
        >
          <YStack marginBottom="$4" alignItems="center">
            <Avatar circular size="$10">
              <Avatar.Image
                src={`https://ui-avatars.com/api/?name=${user?.name}&background=2F80ED&color=fff&size=128`}
              />
              <Avatar.Fallback backgroundColor={Colors.primary} />
            </Avatar>
            <YStack
              position="absolute"
              bottom={0}
              right={0}
              backgroundColor={Colors.card}
              borderRadius="$10"
              padding="$2"
              borderWidth={2}
              borderColor={Colors.background}
            >
              <TouchableOpacity onPress={() => setOpenSheet(true)}>
                <Feather name="edit-2" size={16} color={Colors.text} />
              </TouchableOpacity>
            </YStack>
          </YStack>

          <H3 color={Colors.text} fontWeight="bold">
            {user?.name}
          </H3>
          <Text color={Colors.text}>{user?.email}</Text>

          <XStack marginTop="$3" gap="$2">
            <YStack
              backgroundColor={Colors.card}
              paddingHorizontal="$3"
              paddingVertical="$1"
              borderRadius="$10"
              borderColor={Colors.cardBorder}
              borderWidth={1}
            >
              <Text
                color={Colors.primary}
                fontSize={12}
                fontWeight="bold"
                textTransform="uppercase"
              >
                {user?.role}
              </Text>
            </YStack>
            {user?.role === "production" && (
              <YStack
                backgroundColor="rgba(0, 200, 81, 0.1)"
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$10"
                borderColor={Colors.success}
                borderWidth={1}
              >
                <Text color={Colors.success} fontSize={12} fontWeight="bold">
                  ₹ {user?.priceAllotted}/unit
                </Text>
              </YStack>
            )}
          </XStack>
        </LinearGradient>

        {/* 2. Settings Groups */}
        <YStack padding="$4" gap="$4">
          {/* Account Settings */}
          <YStack>
            <Text
              color={Colors.text}
              fontSize={12}
              fontWeight="bold"
              marginBottom="$2"
              letterSpacing={1}
            >
              ACCOUNT
            </Text>
            <YStack
              backgroundColor={Colors.card}
              borderRadius="$4"
              padding="$3"
              borderColor={Colors.cardBorder}
              borderWidth={1}
            >
              <MenuItem
                icon="user"
                label="Personal Details"
                onPress={() => setOpenSheet(true)}
              />
              <Separator borderColor={Colors.cardBorder} />
              <MenuItem
                icon="smartphone"
                label="Mobile Number"
                value={user?.mobile || "Not set"}
                onPress={() => setOpenSheet(true)}
              />
            </YStack>
          </YStack>

          {/* App Preferences */}
          <YStack>
            <Text
              color={Colors.text}
              fontSize={12}
              fontWeight="bold"
              marginBottom="$2"
              letterSpacing={1}
            >
              PREFERENCES
            </Text>
            <YStack
              backgroundColor={Colors.card}
              borderRadius="$4"
              padding="$3"
              borderColor={Colors.cardBorder}
              borderWidth={1}
            >
              <XStack
                paddingVertical="$3"
                alignItems="center"
                justifyContent="space-between"
              >
                <XStack gap="$3" alignItems="center">
                  <YStack
                    width={36}
                    height={36}
                    borderRadius="$4"
                    backgroundColor={Colors.card}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Feather name="bell" size={18} color={Colors.primary} />
                  </YStack>
                  <Text color={Colors.text} fontSize={16}>
                    Push Notifications
                  </Text>
                </XStack>
                <Switch
                  size="$2"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  backgroundColor={
                    notifications ? Colors.primary : Colors.cardBorder
                  }
                >
                  <Switch.Thumb animation="bouncy" />
                </Switch>
              </XStack>
              <Separator borderColor={Colors.cardBorder} />
              <XStack
                paddingVertical="$3"
                alignItems="center"
                justifyContent="space-between"
              >
                <XStack gap="$3" alignItems="center">
                  <YStack
                    width={36}
                    height={36}
                    borderRadius="$4"
                    backgroundColor={Colors.card}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Feather
                      name={theme === "dark" ? "moon" : "sun"}
                      size={18}
                      color={Colors.primary}
                    />
                  </YStack>
                  <Text color={Colors.text} fontSize={16}>
                    Dark Mode
                  </Text>
                </XStack>

                <Switch
                  size="$2"
                  checked={theme === "dark"} // ✅ Check real theme
                  onCheckedChange={toggleTheme} // ✅ Call real toggle
                  backgroundColor={
                    theme === "dark" ? Colors.primary : Colors.cardBorder
                  }
                >
                  <Switch.Thumb animation="bouncy" />
                </Switch>
              </XStack>
            </YStack>
          </YStack>

          {/* Support & Logout */}
          <YStack>
            <Text
              color={Colors.text}
              fontSize={12}
              fontWeight="bold"
              marginBottom="$2"
              letterSpacing={1}
            >
              SUPPORT
            </Text>
            <YStack
              backgroundColor={Colors.card}
              borderRadius="$4"
              padding="$3"
              borderColor={Colors.cardBorder}
              borderWidth={1}
            >
              <MenuItem
                icon="help-circle"
                label="Help & Support"
                onPress={() => Linking.openURL("mailto:support@masalaflow.com")}
              />
              <Separator borderColor={Colors.cardBorder} />
              <MenuItem
                icon="log-out"
                label="Log Out"
                isDestructive
                onPress={() => {
                  if (Platform.OS === "web") {
                    if (confirm("Log Out, Are you sure?")) logout();
                  } else {
                    Alert.alert("Log Out", "Are you sure?", [
                      { text: "Cancel" },
                      {
                        text: "Log Out",
                        style: "destructive",
                        onPress: logout,
                      },
                    ]);
                  }
                }}
              />
            </YStack>
          </YStack>

          {/* <Text
            textAlign="center"
            color={Colors.text}
            fontSize={12}
            marginTop="$4"
          >
            Version 2.4.0 • Nexus Supply Inc.
          </Text> */}
          <AppVersionDisplay marginTop="$4" />
        </YStack>
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
        <Sheet.Frame padding="$4" gap="$4" backgroundColor={Colors.card}>
          <Sheet.Handle />
          <H3 color="white" textAlign="center">
            Edit Profile
          </H3>

          <YStack gap="$3">
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              backgroundColor={Colors.background}
              color="white"
              borderColor={Colors.cardBorder}
              placeholderTextColor="$gray10"
            />
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="Email Address"
              backgroundColor={Colors.background}
              color="white"
              borderColor={Colors.cardBorder}
              placeholderTextColor="$gray10"
              keyboardType="email-address"
            />
            <Input
              value={mobile}
              onChangeText={setMobile}
              placeholder="Mobile Number"
              backgroundColor={Colors.background}
              color="white"
              borderColor={Colors.cardBorder}
              placeholderTextColor="$gray10"
              keyboardType="phone-pad"
            />
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="New Password (Optional)"
              backgroundColor={Colors.background}
              color="white"
              borderColor={Colors.cardBorder}
              placeholderTextColor="$gray10"
              secureTextEntry
            />
          </YStack>

          <Button
            backgroundColor={Colors.primary}
            onPress={handleUpdate}
            disabled={loading}
            icon={loading ? <Spinner color="white" /> : undefined}
          >
            <Text color={Colors.text} fontWeight="bold">
              {loading ? "Saving..." : "Save Changes"}
            </Text>
          </Button>
        </Sheet.Frame>
      </Sheet>
    </SafeAreaView>
  );
}
