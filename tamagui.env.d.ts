// frontend/tamagui.env.d.ts
import { AppConfig } from "./tamagui.config"; // Ensure this path points to your actual config file

declare module "tamagui" {
  // This overrides the default config with YOUR config
  interface TamaguiCustomConfig extends AppConfig {}
}
