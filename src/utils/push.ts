import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";
const PUSH_PREF_KEY = "pushEnabled";

// --- Enabled preference (module pattern mirrors src/utils/haptics.ts) ---
let enabled = true;
let hydrated = false;

export const setPushEnabled = (value: boolean) => {
  enabled = value;
  hydrated = true;
  AsyncStorage.setItem(PUSH_PREF_KEY, value ? "true" : "false").catch(() => {});
};

export const hydratePushSetting = async () => {
  if (hydrated) return;
  try {
    const stored = await AsyncStorage.getItem(PUSH_PREF_KEY);
    enabled = stored !== "false";
  } catch {
    enabled = true;
  } finally {
    hydrated = true;
  }
};

export const isPushEnabled = () => enabled;

// --- Registration ---

// Guard so a session only registers once per user (login + session restore
// both funnel through here).
let registeredForUserId: string | null = null;

// Android needs a channel before local notifications can be shown.
const ensureAndroidChannel = async () => {
  if (Platform.OS !== "android") return;
  try {
    const existing = await Notifications.getNotificationChannelsAsync();
    const hasMain = existing.some((c) => c.id === "default");
    if (!hasMain) {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2F80ED",
      });
    }
  } catch {
    // Channel API unavailable — ignore
  }
};

// Registers the device for Expo push and posts the token to the backend.
// Never throws; returns true when the token was saved.
export async function registerForPush(user: {
  _id: string;
  token: string;
}): Promise<boolean> {
  if (!user?._id || !user?.token) return false;
  if (registeredForUserId === user._id) return true;
  if (!enabled) return false;

  try {
    await ensureAndroidChannel();

    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return false;

    const token = await Notifications.getExpoPushTokenAsync();
    await axios.post(
      `${API_URL}/users/push-token`,
      { expoPushToken: token.data },
      { headers: { Authorization: `Bearer ${user.token}` } },
    );

    registeredForUserId = user._id;
    return true;
  } catch (error) {
    console.error("registerForPush failed:", error);
    return false;
  }
}

// How notifications behave while the app is open: show an alert
// (must be called once at startup, before any notifications arrive).
export const configureNotificationBehavior = () => {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // web / unavailable — ignore
  }
};
