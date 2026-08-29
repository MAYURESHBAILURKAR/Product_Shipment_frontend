import React from "react";
import {
  Defs,
  Path,
  RadialGradient,
  Stop,
  Svg,
} from "react-native-svg";
import { palette } from "../src/theme/tokens";
import { XStack, YStack } from "tamagui";
import { H2, Text } from "tamagui";

interface LogoProps {
  size?: number;
  showText?: boolean;
  color?: string;
}

export const Logo = ({ size = 40, showText = true, color }: LogoProps) => {
  const primaryColor = color || palette.primaryBright;
  const glowId = `logo-glow-${size}`;

  // Soft radial glow behind the isometric mark.
  const iconWithGlow = (
    <YStack width={size} height={size} justifyContent="center" alignItems="center">
      <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d="M20 2L4 10V28L20 36L36 28V10L20 2Z" fill={`url(#${glowId})`} />
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
    </YStack>
  );

  if (!showText) {
    return iconWithGlow;
  }

  return (
    <XStack alignItems="center" gap="$3">
      {iconWithGlow}
      <YStack justifyContent="center">
        <H2
          color={palette.text}
          fontWeight="bold"
          fontSize={size * 0.6}
          lineHeight={size * 0.7}
          letterSpacing={-0.5}
        >
          Nexus
        </H2>
        <Text
          color={primaryColor}
          fontWeight="700"
          fontSize={size * 0.35}
          lineHeight={size * 0.4}
          letterSpacing={2}
          textTransform="uppercase"
        >
          Supply
        </Text>
      </YStack>
    </XStack>
  );
};
