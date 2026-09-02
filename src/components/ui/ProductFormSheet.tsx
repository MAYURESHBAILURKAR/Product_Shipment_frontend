import { Feather } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Image as RNImage,
  Modal,
  Pressable,
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
import { Input, Sheet, Text as TText } from "tamagui";
import { palette, radius, spacing } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { useLanguage, type TranslationKey } from "../../i18n/LanguageProvider";
import { getErrorMessage } from "../../utils/errors";
import { AppDialog, PressableScale, PrimaryButton, useDismissOnBack, useToast } from "./index";

const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/products`;

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null = create mode; product object = edit mode */
  product: any | null;
  onSaved: () => void;
}

// Shared Add/Edit product form. Form logic is identical to the original
// Products screen sheet (FormData + cloudinary-skip on unchanged image).
export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormSheetProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [name, setName] = useState(product?.name || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [image, setImage] = useState<any>(
    product ? { uri: product.photoUrl } : null,
  );
  const [uploading, setUploading] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [showImageSource, setShowImageSource] = useState(false);

  // Re-seed the form each time the sheet opens (it stays mounted).
  useEffect(() => {
    if (open) {
      setName(product?.name || "");
      setBrand(product?.brand || "");
      setImage(product ? { uri: product.photoUrl } : null);
    }
  }, [open, product]);

  useDismissOnBack(open, () => onOpenChange(false));

  // Camera needs explicit permission on iOS/Android 13+.
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast({ message: t("products.cameraPermission"), kind: "error" });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const handleSave = async () => {
    if (!name || !brand) {
      showToast({ message: t("products.nameBrandRequired"), kind: "error" });
      return;
    }

    // Confirm before update (create goes straight through)
    if (product) {
      setConfirmUpdate(true);
      return;
    }
    await performSave();
  };

  const performSave = async () => {
    setUploading(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("brand", brand);

    if (image && !image.uri.includes("cloudinary")) {
      // @ts-ignore
      formData.append("image", {
        uri: image.uri,
        type: "image/jpeg",
        name: "product.jpg",
      });
    }

    try {
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${user?.token}`,
        },
      };
      if (product) await axios.put(`${API_URL}/${product._id}`, formData, config);
      else await axios.post(API_URL, formData, config);
      onOpenChange(false);
      showToast({
        message: product ? t("products.productUpdated") : t("products.productCreated"),
        kind: "success",
      });
      onSaved();
    } catch (error: any) {
      // Server messages win (duplicates read well); helper maps the rest
      // (network / timeout / image-too-large / server busy).
      showToast({
        message: getErrorMessage(error, t, "admin.operationFailed"),
        kind: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[80]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay />
      <Sheet.Frame padding="$4" gap="$4" backgroundColor={palette.surfaceElevated}>
        <Sheet.Handle />
        <TText color={palette.text} fontSize={20} fontWeight="700" textAlign="center">
          {product ? t("products.editProduct") : t("products.newProduct")}
        </TText>

        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <PressableScale onPress={() => setShowImageSource(true)} hapticFeedback>
            <View style={styles.imagePicker}>
              {image ? (
                <RNImage
                  source={{ uri: image.uri }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <Feather name="camera" size={28} color={palette.textTertiary} />
              )}
            </View>
            <Text style={styles.changeImage}>
              {image ? t("products.changeImage") : t("products.addImage")}
            </Text>
          </PressableScale>
        </View>

        <Input
          placeholder={t("products.productName")}
          value={name}
          onChangeText={setName}
          backgroundColor={palette.surfaceHighest}
          color={palette.text}
          placeholderTextColor="$gray10"
          borderColor={palette.border}
        />
        <Input
          placeholder={t("products.brandLabel")}
          value={brand}
          onChangeText={setBrand}
          backgroundColor={palette.surfaceHighest}
          color={palette.text}
          placeholderTextColor="$gray10"
          borderColor={palette.border}
        />

        <PrimaryButton
          label={product ? t("products.updateProductBtn") : t("products.createProductBtn")}
          loading={uploading}
          onPress={handleSave}
        />
      </Sheet.Frame>

      {/* Update confirm */}
      <AppDialog
        visible={confirmUpdate}
        title={t("products.updateProductBtn")}
        message={t("products.saveChangesTo", { name: product?.name ?? "" })}
        kind="default"
        icon="save"
        buttons={[
          {
            label: t("common.cancel"),
            style: "cancel",
            onPress: () => setConfirmUpdate(false),
          },
          {
            label: t("products.updateBtn"),
            style: "confirm",
            onPress: () => {
              setConfirmUpdate(false);
              performSave();
            },
          },
        ]}
      />
      {/* Image source chooser — camera or gallery */}
      <ImageSourceDialog
        visible={showImageSource}
        hasImage={!!image}
        t={t}
        onClose={() => setShowImageSource(false)}
        onCamera={() => {
          setShowImageSource(false);
          takePhoto();
        }}
        onGallery={() => {
          setShowImageSource(false);
          pickFromGallery();
        }}
        onRemove={() => {
          setShowImageSource(false);
          setImage(null);
        }}
      />
    </Sheet>
  );
}

// Stacked action-sheet for choosing the image source (camera / gallery /
// remove). Full-width rows read better than 3 buttons crammed in AppDialog's
// single row. Takes `t` as a prop — it renders inside the Sheet portal, which
// sits outside the LanguageProvider context (same reason SortSheet takes t).
function ImageSourceDialog({
  visible,
  hasImage,
  t,
  onClose,
  onCamera,
  onGallery,
  onRemove,
}: {
  visible: boolean;
  hasImage: boolean;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onRemove: () => void;
}) {
  const fade = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      fade.value = withTiming(1, { duration: 180 });
      card.value = withDelay(60, withSpring(1, { damping: 16, stiffness: 220, mass: 0.9 }));
    } else {
      fade.value = withTiming(0, { duration: 140 });
      card.value = withTiming(0, { duration: 140 });
    }
  }, [visible, fade, card]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [{ translateY: (1 - card.value) * 24 }, { scale: 0.94 + card.value * 0.06 }],
  }));

  const Row = ({
    icon,
    label,
    hint,
    danger,
    onPress,
  }: {
    icon: string;
    label: string;
    hint: string;
    danger?: boolean;
    onPress: () => void;
  }) => (
    <PressableScale onPress={onPress} hapticFeedback style={sourceStyles.row}>
      <View
        style={[
          sourceStyles.rowIcon,
          { backgroundColor: danger ? "rgba(248,113,113,0.12)" : palette.primarySoft },
        ]}
      >
        <Feather name={icon as any} size={18} color={danger ? palette.danger : palette.primaryBright} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sourceStyles.rowLabel, danger && { color: palette.danger }]}>{label}</Text>
        <Text style={sourceStyles.rowHint}>{hint}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={palette.textTertiary} />
    </PressableScale>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={sourceStyles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, sourceStyles.backdrop, fadeStyle]}>
          <PressableScale onPress={onClose} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[sourceStyles.card, cardStyle]}>
          <TText color={palette.text} fontSize={17} fontWeight="700" textAlign="center" marginBottom="$3">
            {hasImage ? t("products.changeImage") : t("products.addImage")}
          </TText>
          <Row
            icon="camera"
            label={t("products.takePhoto")}
            hint={t("products.takePhotoHint")}
            onPress={onCamera}
          />
          <Row
            icon="image"
            label={t("products.chooseFromGallery")}
            hint={t("products.chooseFromGalleryHint")}
            onPress={onGallery}
          />
          {hasImage && (
            <Row
              icon="trash-2"
              label={t("products.removePhoto")}
              hint={t("products.removePhotoHint")}
              danger
              onPress={onRemove}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const sourceStyles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  backdrop: { backgroundColor: "rgba(0,0,0,0.72)" },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surfaceHighest,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { color: palette.text, fontSize: 14.5, fontWeight: "700" },
  rowHint: { color: palette.textTertiary, fontSize: 11.5, marginTop: 1 },
});

const styles = StyleSheet.create({
  imagePicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.surfaceHighest,
    justifyContent: "center",
    alignItems: "center",
    borderColor: palette.border,
    borderWidth: 1,
    overflow: "hidden",
  },
  changeImage: {
    color: palette.primaryBright,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
  },
});
