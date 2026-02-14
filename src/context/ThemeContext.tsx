// src/context/ThemeContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { NexusColors } from "../constants/Colors";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  Colors: typeof NexusColors.dark; // Type definition for colors
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(
    systemScheme === "dark" ? "dark" : "light",
  );

  // Load saved theme on startup
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem("user-theme");
      if (savedTheme) {
        setTheme(savedTheme as Theme);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    await AsyncStorage.setItem("user-theme", newTheme);
  };

  // Get the active colors based on the current theme
  const Colors = NexusColors[theme];

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, Colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme easily
export const useTheme = () => useContext(ThemeContext);
