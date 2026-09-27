import { useTheme } from "../context/ThemeContext";

// Categorical palette — first 4 slots of the dataviz-skill's validated
// default 8-hue order (blue, orange, aqua, yellow), which passes the
// adjacent-pair CVD/normal-vision gates in both light and dark mode. The
// light-mode aqua/yellow slots sit under the 3:1 contrast floor, which is
// why every chart using them ships a visible legend (the required "relief"
// channel) rather than relying on fill color alone.
const CATEGORICAL_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];
const CATEGORICAL_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500"];

// Matches --color-border / --color-text-muted / --color-surface / --color-accent
// in index.css, so charts sit visually inside the app's existing theme.
const GRID_LIGHT = "#e2e2e2";
const GRID_DARK = "#333333";
const AXIS_TEXT_LIGHT = "#6b6f6b";
const AXIS_TEXT_DARK = "#9a9d9a";
const SURFACE_LIGHT = "#ffffff";
const SURFACE_DARK = "#202020";
const ACCENT_LIGHT = "#337418";
const ACCENT_DARK = "#5dd62c";

export function useChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return {
    categorical: isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT,
    grid: isDark ? GRID_DARK : GRID_LIGHT,
    axisText: isDark ? AXIS_TEXT_DARK : AXIS_TEXT_LIGHT,
    surface: isDark ? SURFACE_DARK : SURFACE_LIGHT,
    accent: isDark ? ACCENT_DARK : ACCENT_LIGHT,
  };
}
