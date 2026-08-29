// Dark-only theme module. The app ships a single premium dark theme;
// `useTheme()` keeps its original signature so consumers don't change.
import { palette } from "../theme/tokens";

export type Theme = "dark";

export type AppColors = typeof palette;

export const useTheme = (): {
  theme: Theme;
  Colors: AppColors;
} => ({
  theme: "dark",
  Colors: palette,
});
