import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── VividCare Design System ───────────────────────────────────
        // Primary — teal
        "vc-primary":     "#0d9488",
        "vc-primary-700": "#0f766e",
        "vc-primary-800": "#115e59",
        "vc-primary-50":  "#f0fdfa",
        "vc-primary-100": "#ccfbf1",

        // Surface
        "vc-bg":           "#f7f8f9",
        "vc-surface":      "#ffffff",
        "vc-surface-2":    "#fafbfc",
        "vc-border":       "#e6e8ec",
        "vc-border-strong":"#d1d5db",

        // Text
        "vc-text":   "#0f172a",
        "vc-text-2": "#475569",
        "vc-text-3": "#64748b",
        "vc-text-4": "#94a3b8",

        // Status
        "vc-emerald":    "#059669",
        "vc-emerald-50": "#ecfdf5",
        "vc-amber":      "#d97706",
        "vc-amber-50":   "#fffbeb",
        "vc-red":        "#dc2626",
        "vc-red-50":     "#fef2f2",
        "vc-blue":       "#2563eb",
        "vc-blue-50":    "#eff6ff",

        // Legacy neutral tokens (kept for existing pages)
        "surface-container-low":      "#f2f4f6",
        "secondary-container":        "#aeeecb",
        "on-surface":                 "#191c1e",
        "on-primary-fixed-variant":   "#004a77",
        "surface-container":          "#eceef0",
        "primary-fixed":              "#cfe5ff",
        "inverse-surface":            "#2d3133",
        "surface":                    "#ffffff",
        "surface-container-high":     "#e6e8ea",
        "surface-container-highest":  "#e0e3e5",
        "on-error":                   "#ffffff",
        "outline-variant":            "#c1c7d1",
        "primary":                    "#0d9488",
        "primary-container":          "#0f766e",
        "surface-bright":             "#ffffff",
        "inverse-primary":            "#ccfbf1",
        "outline":                    "#64748b",
        "error-container":            "#fef2f2",
        "on-primary":                 "#ffffff",
        "error":                      "#dc2626",
        "on-surface-variant":         "#475569",
        "inverse-on-surface":         "#f7f8f9",
        "background":                 "#f7f8f9",
        "on-background":              "#0f172a",
      },
      fontFamily: {
        headline: ["var(--font-body)", "IBM Plex Sans", "sans-serif"],
        body:     ["var(--font-body)", "IBM Plex Sans", "sans-serif"],
        label:    ["var(--font-body)", "IBM Plex Sans", "sans-serif"],
        mono:     ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm:   "6px",
        DEFAULT: "8px",
        md:   "10px",
        lg:   "12px",
        xl:   "14px",
        "2xl":"16px",
        "3xl":"20px",
        full: "9999px",
      },
      boxShadow: {
        "vc-sm": "0 1px 2px rgba(15,23,42,0.04)",
        "vc":    "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        "vc-lg": "0 8px 24px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
