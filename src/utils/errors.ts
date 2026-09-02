import axios from "axios";
import type { TranslationKey } from "../i18n/LanguageProvider";

// Maps any caught error to a user-friendly, cause-specific message. Every
// screen's catch block funnels through here so a network drop, a timeout, a
// server bug, and an auth failure each say what actually went wrong instead
// of a generic "Operation failed".
//
// Priority:
//   1. Server-provided message  (backend sends readable ones, e.g. duplicates)
//   2. Network / timeout        (device offline, request timed out)
//   3. HTTP status classes      (permission, not found, server error)
//   4. Caller's contextual key  (fallback naming the action that failed)

export type TFunc = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

export function getErrorMessage(
  error: any,
  t: TFunc,
  fallbackKey: TranslationKey,
): string {
  // 1. Backend sent a readable message — trust it (it's written for users).
  const serverMessage = error?.response?.data?.message;
  if (typeof serverMessage === "string" && serverMessage.trim()) {
    return serverMessage;
  }

  // 2. No response at all → the request never reached the server.
  if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
    return t("errors.timedOut");
  }
  if (!error?.response) {
    if (axios.isCancel?.(error)) return t("errors.cancelled");
    return t("errors.noConnection");
  }

  // 3. The server answered — classify by status.
  const status: number | undefined = error.response?.status;
  if (status === 401) return t("errors.sessionExpired");
  if (status === 403) return t("errors.notAllowed");
  if (status === 404) return t("errors.notFound");
  if (status === 409) return t("errors.conflict");
  if (status === 413) return t("errors.tooLarge");
  if (status === 429) return t("errors.tooManyRequests");
  if (status !== undefined && status >= 500) return t("errors.serverBusy");

  // 4. Contextual fallback — names the action, still friendlier than generic.
  return t(fallbackKey);
}
