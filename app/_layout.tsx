import { AppVersionDisplay } from "@/components/AppVersionDisplay";
import { Logo } from "@/components/Logo";
import ServerAwakeScreen from "@/ServerAwakeScreen";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router"; // <--- IMPORT useSegments
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
import { ThemeProvider } from "../src/context/ThemeContext";
import config from "../tamagui.config";

SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
        backgroundColor="#0B0E14" // Match your theme background
        gap="$4"
      >
        {/* Big Logo */}
        <Logo size={120} showText={true} />

        {/* Loading Indicator */}
        <Spinner size="large" color="#2F80ED" />

        {/* Version at bottom */}
        <YStack position="absolute" bottom={40}>
          <AppVersionDisplay />
        </YStack>
      </YStack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider>
        <TamaguiProvider config={config} defaultTheme="dark">
          <PortalProvider shouldAddRootHost>
            <Theme name="dark">
              <SafeAreaProvider>
                <StatusBar style="light" />

                {/* ✅ LOGIC: Show Awake Screen First */}
                {!isServerReady ? (
                  <ServerAwakeScreen
                    onServerReady={() => setServerReady(true)}
                  />
                ) : (
                  <RootNavigation />
                )}
              </SafeAreaProvider>
            </Theme>
          </PortalProvider>
        </TamaguiProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
