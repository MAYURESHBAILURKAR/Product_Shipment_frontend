import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";

interface RupeeIconProps {
  size?: number;
  color?: string;
  style?: object;
}

// Feather has no rupee glyph; MaterialCommunityIcons does. Use this wherever
// a currency icon represents INR, so the icon set stays consistent.
export function RupeeIcon({ size = 17, color = "#FFFFFF", style }: RupeeIconProps) {
  return (
    <MaterialCommunityIcons
      name="currency-rupee"
      size={size}
      color={color}
      style={style as any}
    />
  );
}
