/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bisa: {
          orange: "#FF6B00",
          "orange-light": "#FF9933",
          "orange-lighter": "#FFE7D2",
          emerald: "#059669",
          "emerald-light": "#F0FDF4",
          success: "#00C853",
          info: "#2196F3",
          warning: "#FFD600",
          error: "#D32F2F",
          navy: "#131B2E",
          "grey-mid": "#4A5568",
          "grey-light": "#E2E8F0",
          "off-white": "#FAFAFA",
          bg: "#FAFAFA",
        },
      },
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular", "Plus Jakarta Sans", "sans-serif"],
        medium: ["PlusJakartaSans_500Medium", "Plus Jakarta Sans", "sans-serif"],
        semibold: ["PlusJakartaSans_600SemiBold", "Plus Jakarta Sans", "sans-serif"],
        bold: ["PlusJakartaSans_700Bold", "Plus Jakarta Sans", "sans-serif"],
        extrabold: ["PlusJakartaSans_800ExtraBold", "Plus Jakarta Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
