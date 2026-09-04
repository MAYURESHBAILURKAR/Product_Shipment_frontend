import AsyncStorage from "@react-native-async-storage/async-storage";

const SHARE_PRICE_KEY = "sharePriceEnabled";

// Module-level flag so share handlers (copy text, ViewShot receipts) can
// check it synchronously at share time — mirrors src/utils/haptics.ts.
// Defaults to OFF: prices are omitted from shared content until opted in.
let enabled = false;
let hydrated = false;

export const setSharePriceEnabled = (value: boolean) => {
  enabled = value;
  hydrated = true;
  AsyncStorage.setItem(SHARE_PRICE_KEY, value ? "true" : "false").catch(() => {});
};

// Restore the persisted preference once at app start. Defaults to off.
export const hydrateSharePriceSetting = async () => {
  if (hydrated) return;
  try {
    const stored = await AsyncStorage.getItem(SHARE_PRICE_KEY);
    enabled = stored === "true";
  } catch {
    enabled = false;
  } finally {
    hydrated = true;
  }
};

export const isSharePriceEnabled = () => enabled;
