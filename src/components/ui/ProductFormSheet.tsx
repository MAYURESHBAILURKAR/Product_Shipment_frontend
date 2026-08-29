import { Feather } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Image as RNImage,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Input, Sheet, Text as TText } from "tamagui";
import { palette, radius, spacing } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { AppDialog, PressableScale, PrimaryButton, useToast } from "./index";

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

  const [name, setName] = useState(product?.name || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [image, setImage] = useState<any>(
    product ? { uri: product.photoUrl } : null,
  );
  const [uploading, setUploading] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  // Re-seed the form each time the sheet opens (it stays mounted).
  useEffect(() => {
    if (open) {
      setName(product?.name || "");
      setBrand(product?.brand || "");
      setImage(product ? { uri: product.photoUrl } : null);
    }
  }, [open, product]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const handleSave = async () => {
    if (!name || !brand) {
      showToast({ message: "Name and Brand required", kind: "error" });
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
        message: product ? "Product updated" : "Product created",
        kind: "success",
      });
      onSaved();
    } catch (error) {
      showToast({ message: "Operation failed", kind: "error" });
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
          {product ? "Edit Product" : "New Product"}
        </TText>

        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <PressableScale onPress={pickImage} hapticFeedback>
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
            <Text style={styles.changeImage}>Change Image</Text>
          </PressableScale>
        </View>

        <Input
          placeholder="Product Name"
          value={name}
          onChangeText={setName}
          backgroundColor={palette.surfaceHighest}
          color={palette.text}
          placeholderTextColor="$gray10"
          borderColor={palette.border}
        />
        <Input
          placeholder="Brand"
          value={brand}
          onChangeText={setBrand}
          backgroundColor={palette.surfaceHighest}
          color={palette.text}
          placeholderTextColor="$gray10"
          borderColor={palette.border}
        />

        <PrimaryButton
          label={product ? "Update Product" : "Create Product"}
          loading={uploading}
          onPress={handleSave}
        />
      </Sheet.Frame>

      {/* Update confirm */}
      <AppDialog
        visible={confirmUpdate}
        title="Update Product"
        message={`Save changes to "${product?.name}"?`}
        kind="default"
        icon="save"
        buttons={[
          {
            label: "Cancel",
            style: "cancel",
            onPress: () => setConfirmUpdate(false),
          },
          {
            label: "Update",
            style: "confirm",
            onPress: () => {
              setConfirmUpdate(false);
              performSave();
            },
          },
        ]}
      />
    </Sheet>
  );
}

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
