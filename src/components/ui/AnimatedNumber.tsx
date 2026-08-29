import React, { useEffect, useRef, useState } from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";

interface AnimatedNumberProps {
  value: number;
  /** Prefix placed before the number, e.g. "₹" */
  prefix?: string;
  /** Suffix placed after the number, e.g. " kg" */
  suffix?: string;
  /** Decimal places to show */
  decimals?: number;
  duration?: number;
  style?: RNTextProps["style"];
}

// Count-up number via a JS rAF tween + state. reanimated's animatedProps
// cannot update the `text` prop on the new architecture — it renders empty
// on device — so this stays on the React thread.
export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 900,
  style,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    if (from === value) return;

    const start = Date.now();
    let raf = 0;

    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = from + (value - from) * eased;
      displayRef.current = current;
      setDisplay(current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const formatted = display
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <RNText style={style} numberOfLines={1}>
      {prefix}
      {formatted}
      {suffix}
    </RNText>
  );
}
