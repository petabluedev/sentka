"use client";

import * as React from "react";
import { ThemeProvider as MUIThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { ThemeProvider as ShadcnThemeProvider } from "./theme-provider";

/**
 * We wrap your app with:
 * next-themes (shadcn)  → provides 'class' based dark mode for Tailwind/shadcn components
 * MUI ThemeProvider      → supplies MUI theme + CssBaseline
 * Emotion CacheProvider  → ensures proper style injection order
 */

const muiCache = createCache({ key: "mui", prepend: true });

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#111827" }, // Tailwind 'gray-900' vibe for now
    secondary: { main: "#2563EB" }, // Tailwind 'blue-600'
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider value={muiCache}>
      <ShadcnThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <MUIThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MUIThemeProvider>
      </ShadcnThemeProvider>
    </CacheProvider>
  );
}
