import Constants from "expo-constants";
import React from "react";
import { Text, YStack, YStackProps } from "tamagui";
import { palette } from "../src/theme/tokens";

export const AppVersionDisplay = (props: YStackProps) => {
  // 1. Read version from app.json manifest
  // Use expoConfig for Expo Go/Dev clients, and manifest for built apps if needed as fallback
  const version =
    Constants.expoConfig?.version || Constants.manifest?.version || "Dev";

  // Optional: Read build number for clearer debugging (e.g., 1.0.2 (45))
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode ||
    "";

  const displayVersion = buildNumber
    ? `v${version} (${buildNumber})`
    : `v${version}`;

  return (
    <YStack alignItems="center" gap="$1" {...props}>
      <Text color={palette.primary} fontWeight="600" fontSize={12}>
        <Text
          color={palette.textSecondary}
          fontWeight="400"
          opacity={0.7}
          fontSize={11}
        >
          Developed By :{" "}
        </Text>
        Mayuresh Bailurkar
      </Text>
      <Text
        color={palette.textSecondary}
        fontSize={11}
        fontWeight="600"
        opacity={0.7}
      >
        {displayVersion}
      </Text>
    </YStack>
  );
};
