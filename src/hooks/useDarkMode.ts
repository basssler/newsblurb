"use client";

import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Custom hook for managing dark mode preference
 * Applies theme to document root and persists preference
 */
export function useDarkMode() {
  const [darkMode, setDarkMode] = useLocalStorage("newsblurb_darkmode", true);

  // Apply theme to document when darkMode changes
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (darkMode) {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    }
  }, [darkMode]);

  return { darkMode, setDarkMode };
}
