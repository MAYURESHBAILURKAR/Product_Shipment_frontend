import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React, { ComponentProps } from "react";
import { Platform } from "react-native";
import { palette } from "../../src/theme/tokens";
import { useLanguage } from "../../src/i18n/LanguageProvider";

function TabIcon({
  name,
  color,
  focused,
}: {
  name: ComponentProps<typeof Feather>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <Feather
      name={name}
      size={24}
      color={color}
      style={{ opacity: focused ? 1 : 0.8 }}
    />
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor:
            Platform.OS === "ios" ? "transparent" : palette.surface,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 85 : 65,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 10,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={80} style={{ flex: 1 }} tint="dark" />
          ) : null,
        tabBarActiveTintColor: palette.primaryBright,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -2,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("dash.home"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="grid" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t("dash.inventory"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="package" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="shipments"
        options={{
          title: t("dash.history"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="clock" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("dash.profileTab"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
