import {
  type ColorList,
  getDarkColorList,
  getLightColorList,
} from "../control-flow/colors.ts";

export function toggleTheme():void {
  if (isDarkTheme()) {
    localStorage.setItem("theme", "light");
  } else {
    localStorage.setItem("theme","dark");
  }
}

export function isDarkTheme(): boolean {
  const selectedTheme = localStorage.getItem("theme");
  switch (selectedTheme) {
    case "light":
      return false;
    case "dark":
      return true;
  }
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/**
 * Get the color-list matching the system theme.
 */
export function getSystemColorList(): ColorList {
  if (isDarkTheme()) {
    return getDarkColorList();
  } else {
    return getLightColorList();
  }
}
