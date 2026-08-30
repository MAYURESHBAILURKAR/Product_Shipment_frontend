import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

type HapticKind = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const HAPTICS_KEY = "hapticsEnabled";

// Module-level flag so every haptic() call (including ones inside
// PressableScale/PrimaryButton) can check it synchronously.
let enabled = true;
let hydrated = false;

export const setHapticsEnabled = (value: boolean) => {
  enabled = value;
  hydrated = true;
  AsyncStorage.setItem(HAPTICS_KEY, value ? "true" : "false").catch(() => {});
};

// Restore the persisted preference once at app start. Defaults to on.
export const hydrateHapticsSetting = async () => {
  if (hydrated) return;
  try {
    const stored = await AsyncStorage.getItem(HAPTICS_KEY);
    enabled = stored !== "false";
  } catch {
    enabled = true;
  } finally {
    hydrated = true;
  }
};

export const isHapticsEnabled = () => enabled;

// Centralized haptics — one call site style everywhere. Wrapped in a
// try/catch so unsupported platforms (web) fail silently.
export const haptic = (kind: HapticKind = "light") => {
  if (!enabled) return;
  try {
    switch (kind) {
      case "light":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Haptics unavailable (web/simulator) — ignore
  }
};
