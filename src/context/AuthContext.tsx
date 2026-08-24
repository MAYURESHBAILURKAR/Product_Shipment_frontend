import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "production";
  token: string;
  // 👇 ADD THESE NEW FIELDS
  mobile?: string; // Optional string
  locality?: string;
  priceAllotted?: number;
  isActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        // console.log(storedUser);
      }
    } catch (e) {
      console.error("Failed to load user", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    await AsyncStorage.setItem("token", userData.token);

    // Redirect based on role
    if (userData.role === "admin") {
      // router.replace('/(tabs)/admin'); // We'll build this later
      router.replace("/(tabs)");
    } else {
      router.replace("/(tabs)");
    }
  };

  const logout = async () => {
    try {
      // console.log("logout");

      // 1. Clear Storage
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("token");

      // 2. Clear State (This triggers the useEffect in _layout.tsx)
      setUser(null);

      // 3. Remove manual navigation!
      router.replace("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
