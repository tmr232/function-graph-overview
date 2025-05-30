import { writable } from "svelte/store";
import {
  type ColorList,
  getDarkColorList,
  getLightColorList,
} from "../control-flow/colors.ts";

export function toggleTheme(): void {
  if (isDarkTheme()) {
    localStorage.setItem("theme", "light");
    isDark.set(false);
  } else {
    localStorage.setItem("theme", "dark");
    isDark.set(true);
  }
}

function isDarkTheme(): boolean {
  const selectedTheme = localStorage.getItem("theme");
  switch (selectedTheme) {
    case "light":
      return false;
    case "dark":
      return true;
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/**
 * Get the color-list matching the system theme.
 */
export function getSystemColorList(): ColorList {
  if (isDarkTheme()) {
    return getDarkColorList();
  }
  return getLightColorList();
}

export const isDark = writable(isDarkTheme());
