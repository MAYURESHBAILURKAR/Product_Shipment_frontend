import React from "react";
import {
    Path,
    Svg
} from "react-native-svg";
import { H2, Text, useTheme, XStack, YStack } from "tamagui";

interface LogoProps {
  size?: number;
  showText?: boolean;
  color?: string;
}

export const Logo = ({ size = 40, showText = true, color }: LogoProps) => {
  const theme = useTheme();
  // Use passed color, or default to primary blue, or fallback to white depending on context
  const primaryColor = color || theme.primary?.get() || "#2F80ED";
  const textColor = theme.color?.get() || "white";

  // The SVG path defines a stylized isometric box with connecting lines
  const iconPath = (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path
        d="M20 2L4 10V28L20 36L36 28V10L20 2Z"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.2}
      />
      <Path d="M20 12L28 16V24L20 28L12 24V16L20 12Z" fill={primaryColor} />
      <Path
        d="M12 24L4 28M28 16L36 10M20 2V12M20 28V36"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 10L20 18L36 10"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20 36L20 20"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.5}
      />
    </Svg>
  );

  if (!showText) {
    return iconPath;
  }

  return (
    <XStack alignItems="center" gap="$3">
      {iconPath}
      <YStack justifyContent="center">
        <H2
          color={textColor}
          fontWeight="bold"
          fontSize={size * 0.6}
          lineHeight={size * 0.7}
          letterSpacing={0.5}
        >
          Nexus
        </H2>
        <Text
          color={primaryColor}
          fontWeight="600"
          fontSize={size * 0.35}
          lineHeight={size * 0.4}
          letterSpacing={1.5}
          textTransform="uppercase"
        >
          Supply
        </Text>
      </YStack>
    </XStack>
  );
};
