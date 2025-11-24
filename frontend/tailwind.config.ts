import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Tailwind v4에서 RGB 색상 공간 사용 (html2canvas 호환성)
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
