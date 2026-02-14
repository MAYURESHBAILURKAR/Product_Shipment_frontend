import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useTheme } from "../../src/context/ThemeContext"; // ✅ Import custom hook

export default function TabLayout() {
  const { Colors, theme } = useTheme(); // ✅ Get Nexus Colors

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0, // Remove Android shadow for clean flat look
          backgroundColor: Platform.OS === "ios" ? "transparent" : Colors.card,
          borderTopColor: Colors.cardBorder,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 85 : 65, // Taller for modern touch
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 10,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={95}
              style={{ flex: 1 }}
              tint={theme === "dark" ? "dark" : "light"} // Adaptive glass effect
            />
          ) : null,
        tabBarActiveTintColor: Colors.primary, // Nexus Blue
        tabBarInactiveTintColor: Colors.textGray,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="grid"
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.8 }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="package"
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.8 }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="shipments"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="clock"
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.8 }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="user"
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.8 }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
