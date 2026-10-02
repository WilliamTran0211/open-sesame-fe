export const THEME_STORAGE_KEY = "open-sesame-theme";

// Follows the system setting until the user picks a theme with the toggle.
export function useTheme() {
  const isDark = useState<boolean>("theme.isDark", () => false);

  function toggle() {
    isDark.value = !isDark.value;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark.value ? "dark" : "light");
    } catch {
      // Storage can be blocked (private mode); the choice still applies this visit.
    }
  }

  return { isDark, toggle };
}
