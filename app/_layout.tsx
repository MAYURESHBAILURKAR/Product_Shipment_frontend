import { AppVersionDisplay } from "@/components/AppVersionDisplay";
import { Logo } from "@/components/Logo";
import ServerAwakeScreen from "@/ServerAwakeScreen";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  PortalProvider,
  Spinner,
  TamaguiProvider,
  Theme,
  YStack,
} from "tamagui";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import config from "../tamagui.config";
import { palette } from "../src/theme/tokens";
import { ToastProvider } from "../src/components/ui";
import { hydrateHapticsSetting } from "../src/utils/haptics";
import {
  LanguageProvider,
  hydrateLanguageSetting,
} from "../src/i18n/LanguageProvider";
import {
  configureNotificationBehavior,
  hydratePushSetting,
} from "../src/utils/push";

SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Notification tap → open the related shipment (when we have one and
  // the user is signed in).
  useEffect(() => {
    const openFromResponse = (response: Notifications.NotificationResponse) => {
      const shipmentId = (response.notification.request.content.data as any)
        ?.shipmentId;
      if (shipmentId && user) {
        router.push({
          pathname: "/shipment/[id]",
          params: { id: shipmentId },
        });
      }
    };

    // Cold start: the notification that launched the app, if any.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openFromResponse(response);
    });

    // Warm start / foreground tap.
    const sub = Notifications.addNotificationResponseReceivedListener(
      openFromResponse,
    );

    return () => sub.remove();
  }, [user, router]);

  useEffect(() => {
    // console.log("RootNavigation", user);

    if (isLoading) return;

    const inAuthGroup = segments[0] === "(tabs)";

    if (!user && inAuthGroup) {
      // console.log("inAuthGroup", user);
      // If not logged in and inside tabs, kick back to login
      setTimeout(() => {
        router.replace("/login");
      }, 0);
    } else if (user && segments[0] === undefined) {
      // If logged in and on login screen (root), go to tabs
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  // SHOW SPINNER WHILE LOADING FROM STORAGE
  if (isLoading) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor={palette.background}
        gap="$4"
      >
        {/* Big Logo */}
        <Logo size={120} showText={true} />

        {/* Loading Indicator */}
        <Spinner size="large" color={palette.primary} />

        {/* Version at bottom */}
        <YStack position="absolute" bottom={40}>
          <AppVersionDisplay />
        </YStack>
      </YStack>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade_from_bottom" }} />
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false, animation: "fade_from_bottom" }}
      />
      <Stack.Screen name="login" options={{ animation: "fade" }} />
      <Stack.Screen name="forgot-password" options={{ animation: "fade" }} />
      <Stack.Screen
        name="shipment-tracker"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="shipment-new"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="my-earnings"
        options={{ animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
    InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
  });

  const [isServerReady, setServerReady] = useState(false);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
    hydrateHapticsSetting();
    // Language: restore the saved locale before screens render.
    hydrateLanguageSetting();
    // Push: restore pref + make foreground notifications show as alerts.
    hydratePushSetting();
    configureNotificationBehavior();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <TamaguiProvider config={config} defaultTheme="dark">
        <PortalProvider shouldAddRootHost>
          <Theme name="dark">
            <SafeAreaProvider>
              <StatusBar style="light" />
              <LanguageProvider>
                <ToastProvider>
                  {/* ✅ LOGIC: Show Awake Screen First */}
                  {!isServerReady ? (
                    <ServerAwakeScreen
                      onServerReady={() => setServerReady(true)}
                    />
                  ) : (
                    <RootNavigation />
                  )}
                </ToastProvider>
              </LanguageProvider>
            </SafeAreaProvider>
          </Theme>
        </PortalProvider>
      </TamaguiProvider>
    </AuthProvider>
  );
}
