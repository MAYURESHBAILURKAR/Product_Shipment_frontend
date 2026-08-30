import { Feather } from "@expo/vector-icons";
import React, { ComponentProps, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { palette, radius, spacing } from "../../theme/tokens";
import { haptic } from "../../utils/haptics";
import { PressableScale } from "./PressableScale";

type FeatherName = ComponentProps<typeof Feather>["name"];
type DialogKind = "default" | "danger" | "success";

export interface DialogButton {
  label: string;
  onPress: () => void;
  /** "cancel" = ghost, "confirm" = primary, "danger" = red */
  style?: "cancel" | "confirm" | "danger";
}

interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: FeatherName;
  kind?: DialogKind;
  buttons: DialogButton[];
}

const KIND_CONFIG: Record<
  DialogKind,
  { icon: FeatherName; color: string; bg: string; border: string }
> = {
  default: {
    icon: "help-circle",
    color: palette.primaryBright,
    bg: palette.primarySoft,
    border: `${palette.primary}33`,
  },
  danger: {
    icon: "alert-triangle",
    color: palette.danger,
    bg: "rgba(248, 113, 113, 0.12)",
    border: `${palette.danger}40`,
  },
  success: {
    icon: "check-circle",
    color: palette.success,
    bg: "rgba(34, 197, 94, 0.12)",
    border: `${palette.success}40`,
  },
};

// Animated confirmation dialog — backdrop fades in, card springs up + scales.
export function AppDialog({
  visible,
  title,
  message,
  icon,
  kind = "default",
  buttons,
}: AppDialogProps) {
  const config = KIND_CONFIG[kind];

  const backdrop = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      haptic("light");
      backdrop.value = withTiming(1, { duration: 180 });
      card.value = withDelay(
        60,
        withSpring(1, { damping: 16, stiffness: 220, mass: 0.9 }),
      );
    } else {
      backdrop.value = withTiming(0, { duration: 140 });
      card.value = withTiming(0, { duration: 140 });
    }
  }, [visible, backdrop, card]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [
      { translateY: (1 - card.value) * 24 },
      { scale: 0.92 + card.value * 0.08 },
    ],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        const cancel = buttons.find((b) => b.style === "cancel") ?? buttons[0];
        cancel?.onPress();
      }}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Icon */}
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: config.bg, borderColor: config.border },
            ]}
          >
            <Feather name={icon || config.icon} size={26} color={config.color} />
          </View>

          {/* Text */}
          <Text style={styles.title}>{title}</Text>
          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : null}

          {/* Buttons */}
          <View style={styles.btnRow}>
            {buttons.map((btn, i) => (
              <PressableScale
                key={btn.label}
                hapticFeedback={btn.style !== "cancel"}
                onPress={() => {
                  if (btn.style === "danger") haptic("warning");
                  else if (btn.style === "confirm") haptic("success");
                  btn.onPress();
                }}
                style={[
                  styles.btn,
                  i === 0 && styles.btnSecondary,
                  i > 0 && styles.btnPrimaryBase,
                  btn.style === "danger" && styles.btnDanger,
                  btn.style === "confirm" && styles.btnPrimary,
                  btn.style === "cancel" && styles.btnGhost,
                ]}
              >
                <Text
                  style={[
                    styles.btnLabel,
                    i === 0 && styles.btnLabelSecondary,
                    btn.style === "danger" && styles.btnLabelDanger,
                    btn.style === "cancel" && styles.btnLabelGhost,
                  ]}
                >
                  {btn.label}
                </Text>
              </PressableScale>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
    alignItems: "center",
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  message: {
    color: palette.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  btnRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
    alignSelf: "stretch",
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondary: {
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
  },
  btnPrimaryBase: { backgroundColor: palette.primary },
  btnPrimary: { backgroundColor: palette.primary },
  btnDanger: { backgroundColor: palette.danger },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.border,
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnLabelSecondary: { color: palette.text },
  btnLabelDanger: { color: "#FFFFFF" },
  btnLabelGhost: { color: palette.textSecondary },
});
