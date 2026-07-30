import { themeQuartz, colorSchemeDark } from "ag-grid-community";

// Define custom theme for Light Mode (matching Shadcn UI)
export const agGridLightTheme = themeQuartz.withParams({
  backgroundColor: "hsl(var(--background))",
  foregroundColor: "hsl(var(--foreground))",
  borderColor: "hsl(var(--border))",
  headerBackgroundColor: "hsl(var(--muted) / 0.3)",
  rowHoverColor: "hsl(var(--muted) / 0.5)",
  selectedRowBackgroundColor: "hsl(var(--accent) / 0.5)",
  checkboxCheckedBackgroundColor: "hsl(var(--primary))",
  checkboxBorderRadius: "4px",
  wrapperBorderRadius: "0.75rem",
});

// Define custom theme for Dark Mode (Pitch Black)
export const agGridDarkTheme = themeQuartz
  .withPart(colorSchemeDark)
  .withParams({
    backgroundColor: "#000000",
    foregroundColor: "#ffffff",
    borderColor: "#222222",
    headerBackgroundColor: "#0a0a0a",
    rowHoverColor: "#111111",
    selectedRowBackgroundColor: "#1a1a1a",
    checkboxCheckedBackgroundColor: "hsl(var(--primary))",
    checkboxBorderRadius: "4px",
    wrapperBorderRadius: "0.75rem",
    wrapperBackgroundColor: "#000000",
  });
