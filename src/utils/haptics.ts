import * as Haptics from "expo-haptics";

type HapticKind = "light" | "medium" | "heavy" | "success" | "warning" | "error";

// Centralized haptics — one call site style everywhere. Wrapped in a
// try/catch so unsupported platforms (web) fail silently.
export const haptic = (kind: HapticKind = "light") => {
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
