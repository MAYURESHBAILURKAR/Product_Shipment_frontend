import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import React, { useRef, useState } from "react";
import {
  Image as RNImage,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ViewShot from "react-native-view-shot";
import { palette, radius, spacing } from "../../theme/tokens";
import { PressableScale, PrimaryButton, useToast } from "./index";

export interface ShareShipmentItem {
  name: string;
  brand?: string;
  photoUrl?: string;
  quantity: number;
  /** Optional per-line value; omit when the viewer's rate isn't the sender's (e.g. admin) */
  value?: number;
}

interface ShareShipmentModalProps {
  visible: boolean;
  onClose: () => void;
  /** Receipt title, e.g. "Shipment #A1B2" */
  heading: string;
  ownerName?: string;
  items: ShareShipmentItem[];
  totalItems: number;
  totalValue: number;
}

// Same share flow as the post-create screen: ViewShot receipt image via the
// native share sheet, plus a copy-to-clipboard text summary for captions.
export function ShareShipmentModal({
  visible,
  onClose,
  heading,
  ownerName,
  items,
  totalItems,
  totalValue,
}: ShareShipmentModalProps) {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const { showToast } = useToast();

  const handleShareImage = async () => {
    try {
      setSharing(true);

      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error("Could not capture shipment image");

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast({
          message: "Sharing not available on this device.",
          kind: "error",
        });
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share shipment image",
        UTI: "public.png",
      });
    } catch (err) {
      console.error(err);
      showToast({
        message: "Failed to generate or share the shipment image.",
        kind: "error",
      });
    } finally {
      setSharing(false);
      onClose();
    }
  };

  const handleCopyDetails = async () => {
    try {
      const itemsList = items
        .map(
          ({ name, brand, quantity, value }) =>
            `• ${brand || "Unknown"} - ${name}: ${quantity} pcs${value != null ? ` (₹${value})` : ""}`,
        )
        .join("\n");

      const message = `📦 *Shipment Sent!*

👤 *Owner:* ${ownerName || "—"}
📊 *Total Items:* ${totalItems}
💰 *Total Value:* ₹${totalValue.toFixed(2)}

📝 *Shipment Details:*
${itemsList}`;

      await Clipboard.setStringAsync(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      showToast({ message: "Failed to copy shipment details.", kind: "error" });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* ⚠️ ViewShot subtree stays animation-free — capture reads
              rendered pixels; a mid-animation frame = blank image. */}
          <ViewShot
            ref={viewShotRef}
            options={{ format: "png", quality: 0.92 }}
            style={{ backgroundColor: palette.background }}
          >
            <View style={styles.receipt}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptTitle}>{heading}</Text>
                {ownerName ? (
                  <Text style={styles.receiptSub}>Owner: {ownerName}</Text>
                ) : null}
              </View>

              {items.map((item, i) => (
                <View key={i} style={styles.receiptRow}>
                  <RNImage
                    source={{
                      uri: item.photoUrl || "https://placehold.co/100",
                    }}
                    style={styles.receiptThumb}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.receiptProductName}>
                      {item.brand ? `${item.brand} - ` : ""}
                      {item.name}
                    </Text>
                    <Text style={styles.receiptProductMeta}>
                      {item.quantity} pcs
                      {item.value != null ? ` · ₹${item.value}` : ""}
                    </Text>
                  </View>
                </View>
              ))}

              <View style={styles.receiptFooter}>
                <Text style={styles.receiptTotalLabel}>
                  Total: {totalItems} pcs
                </Text>
                <Text style={styles.receiptTotalValue}>
                  ₹ {totalValue.toFixed(2)}
                </Text>
              </View>
            </View>
          </ViewShot>

          <View style={styles.modalActions}>
            <PressableScale
              hapticFeedback
              onPress={handleCopyDetails}
              style={[styles.copyBtn, copied && styles.copyBtnDone]}
            >
              <Feather
                name={copied ? "check" : "copy"}
                size={17}
                color={copied ? palette.success : palette.text}
              />
              <Text
                style={[styles.copyBtnText, copied && { color: palette.success }]}
              >
                {copied ? "Copied!" : "Copy Details"}
              </Text>
            </PressableScale>

            <PrimaryButton
              label="Share Image"
              icon="image"
              loading={sharing}
              onPress={handleShareImage}
            />

            <Text style={styles.tipText}>
              Tip: Copy Details first, then Share Image and paste as caption
            </Text>

            <PressableScale hapticFeedback onPress={onClose} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </PressableScale>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
  },
  scrollContent: {
    alignItems: "center",
    padding: spacing.lg,
    flexGrow: 1,
    justifyContent: "center",
  },
  receipt: {
    width: 340,
    backgroundColor: palette.background,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  receiptHeader: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  receiptTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  receiptSub: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.sm,
  },
  receiptThumb: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
  },
  receiptProductName: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  receiptProductMeta: {
    color: palette.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  receiptFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopColor: palette.border,
    borderTopWidth: 1,
  },
  receiptTotalLabel: { color: palette.textSecondary, fontSize: 13 },
  receiptTotalValue: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  modalActions: { gap: spacing.sm, marginTop: spacing.lg, width: 340 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: palette.border,
  },
  copyBtnDone: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: `${palette.success}55`,
  },
  copyBtnText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  tipText: {
    color: palette.textSecondary,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  skipBtn: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: { color: palette.textSecondary, fontSize: 14, fontWeight: "600" },
});
