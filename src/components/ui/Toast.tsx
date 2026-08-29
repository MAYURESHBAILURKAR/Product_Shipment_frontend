import { Feather } from "@expo/vector-icons";
import React, {
  ComponentProps,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { palette, radius, spacing } from "../../theme/tokens";
import { haptic } from "../../utils/haptics";

type FeatherName = ComponentProps<typeof Feather>["name"];
type ToastKind = "success" | "error" | "info";

export interface ToastOptions {
  message: string;
  kind?: ToastKind;
  duration?: number;
}

interface ToastAPI {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastAPI>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

const KIND_CONFIG: Record<ToastKind, { icon: FeatherName; color: string }> = {
  success: { icon: "check-circle", color: palette.success },
  error: { icon: "alert-circle", color: palette.danger },
  info: { icon: "info", color: palette.accent },
};

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  duration: number;
}

function ToastRow({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const config = KIND_CONFIG[item.kind];
  const anim = useSharedValue(0);

  React.useEffect(() => {
    anim.value = withSpring(1, { damping: 16, stiffness: 240, mass: 0.8 });
  }, [anim]);

  const style = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [
      { translateY: (1 - anim.value) * -30 },
      { scale: 0.94 + anim.value * 0.06 },
    ],
  }));

  return (
    <Animated.View style={[styles.toast, style]}>
      <Pressable onPress={onDismiss} style={styles.toastPress}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: `${config.color.slice(0, 7)}1F` },
          ]}
        >
          <Feather name={config.icon} size={16} color={config.color} />
        </View>
        <Text style={styles.toastText} numberOfLines={2}>
          {item.message}
        </Text>
        <Feather
          name="x"
          size={14}
          color={palette.textTertiary}
          onPress={onDismiss}
        />
      </Pressable>
    </Animated.View>
  );
}

// Mount once in the root layout — renders toasts above every screen.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, kind = "success", duration = 2600 }: ToastOptions) => {
      haptic(kind === "error" ? "error" : kind === "info" ? "light" : "success");
      const id = counter.current++;
      setToasts((prev) => [...prev.slice(-2), { id, message, kind, duration }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.stack} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastRow key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    top: spacing.xl + 20,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: spacing.sm,
    zIndex: 9999,
  },
  toast: {
    width: "86%",
    maxWidth: 380,
  },
  toastPress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    color: palette.text,
    fontSize: 13.5,
    fontWeight: "600",
    flex: 1,
    lineHeight: 17,
  },
});
