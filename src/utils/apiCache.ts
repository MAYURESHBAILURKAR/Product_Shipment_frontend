import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosRequestConfig } from "axios";

// Cache envelope stored under each key.
interface CacheEntry<T> {
  data: T;
  savedAt: number;
}

export interface CachedResult<T> {
  data: T;
  /** true = served from cache because the network call failed */
  stale: boolean;
  /** when the cached copy was saved (ms epoch); null when fresh */
  savedAt: number | null;
}

const CACHE_PREFIX = "cache:";

// GET with offline fallback: on success, refresh the cache and return fresh
// data; on failure (network/server down), serve the last-good copy so the
// screen keeps working. When there is no cached copy at all, rethrow so the
// caller's existing error handling runs unchanged.
export async function cachedGet<T>(
  key: string,
  url: string,
  config?: AxiosRequestConfig,
): Promise<CachedResult<T>> {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  try {
    const { data } = await axios.get<T>(url, config);
    AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({ data, savedAt: Date.now() } satisfies CacheEntry<T>),
    ).catch(() => {});
    return { data, stale: false, savedAt: null };
  } catch (error) {
    let cached: CacheEntry<T> | null = null;
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) cached = JSON.parse(raw);
    } catch {
      cached = null;
    }
    if (cached) {
      return { data: cached.data, stale: true, savedAt: cached.savedAt };
    }
    throw error;
  }
}

// Relative age for banner text, e.g. "2h ago".
export const describeAge = (savedAt: number): string => {
  const mins = Math.max(1, Math.round((Date.now() - savedAt) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

// Wipe all cached GET responses (used on logout so the next user never sees
// the previous user's data).
export async function clearUserCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error("clearUserCache failed:", error);
  }
}
