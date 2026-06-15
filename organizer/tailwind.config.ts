import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: "#1e293b",
        "sidebar-hover": "#334155",
        "sidebar-active": "#3B82F6",
        primary: "#3B82F6",
        "primary-hover": "#2563EB",
        surface: "#f8fafc",
        card: "#ffffff",
      },
    },
  },
  plugins: [],
};
export default config;
