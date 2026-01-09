// contexts/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load saved preference or follow system
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("theme");
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === "dark");
        } else {
          const systemTheme = Appearance.getColorScheme();
          setIsDarkMode(systemTheme === "dark");
        }
      } catch (e) {
        console.log("Failed to load theme", e);
      }
    };
    loadTheme();

    // Listen to system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      AsyncStorage.getItem("theme").then((saved) => {
        if (!saved) {
          setIsDarkMode(colorScheme === "dark");
        }
      });
    });

    return () => subscription?.remove();
  }, []);

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    await AsyncStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: {
      background: isDarkMode ? "#1f1f1f" : "#f8f9fa",
      card: isDarkMode ? "#353434ff" : "#fff",
      text: isDarkMode ? "#e0e0e0" : "#333",
      textSecondary: isDarkMode ? "#aaa" : "#666",
      primary: "#f37d1c",
      border: isDarkMode ? "#333" : "#eee",
      placeholder: isDarkMode ? "#555" : "#ddd",
      overlay: "rgba(0,0,0,0.6)",
      badgeBg: isDarkMode ? "#333" : "#f0f0f0",
      textDisabled: isDarkMode ? "#666" : "#999",
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);