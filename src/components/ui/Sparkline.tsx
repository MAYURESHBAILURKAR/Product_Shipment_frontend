import React, { useMemo } from "react";
import { Path, Svg } from "react-native-svg";
import { palette } from "../../theme/tokens";

interface SparklineProps {
  /** Series of values, oldest → newest. Empty/flat arrays render a baseline. */
  data: number[];
  width: number;
  height: number;
  color?: string;
}

// Minimal dependency-free trend line: normalized points → stroked path with a
// translucent area fill. Zero setup, matches the dark theme tokens.
export function Sparkline({
  data,
  width,
  height,
  color = palette.primaryBright,
}: SparklineProps) {
  const { linePath, areaPath } = useMemo(() => {
    const pad = 4; // breathing room so the stroke isn't clipped
    const w = width - pad * 2;
    const h = height - pad * 2;

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = Math.max(max - min, 1);

    const n = data.length;
    if (n === 0) {
      const y = pad + h; // flat baseline
      return {
        linePath: `M ${pad} ${y} L ${pad + w} ${y}`,
        areaPath: `M ${pad} ${y} L ${pad + w} ${y} L ${pad + w} ${pad + h} L ${pad} ${pad + h} Z`,
      };
    }

    const stepX = n === 1 ? 0 : w / (n - 1);
    const points = data.map((value, i) => {
      const x = pad + i * stepX;
      const y = pad + h - ((value - min) / range) * h;
      return { x, y };
    });

    const line =
      n === 1
        ? `M ${points[0].x} ${points[0].y} L ${points[0].x + 1} ${points[0].y}`
        : points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

    const area = `${line} L ${points[n - 1].x} ${pad + h} L ${points[0].x} ${pad + h} Z`;

    return { linePath: line, areaPath: area };
  }, [data, width, height]);

  return (
    <Svg width={width} height={height}>
      <Path d={areaPath} fill={color} fillOpacity={0.14} />
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
