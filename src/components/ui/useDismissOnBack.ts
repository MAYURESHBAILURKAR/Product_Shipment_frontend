import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";

// Android hardware back should dismiss an open overlay instead of popping
// the route behind it. RN Modal handles this via onRequestClose, but
// Tamagui Sheet renders in the same window and never registers a handler.
export function useDismissOnBack(open: boolean, dismiss: () => void) {
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      dismissRef.current();
      return true; // consume — don't propagate to the router
    });
    return () => sub.remove();
  }, [open]);
}
