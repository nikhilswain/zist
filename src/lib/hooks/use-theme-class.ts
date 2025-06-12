/**
 * Custom hook to get the theme class based on the theme ID
 */
export function useThemeClass(themeId?: string): string {
  if (!themeId) return "";
  return `board-theme-${themeId}`;
}
