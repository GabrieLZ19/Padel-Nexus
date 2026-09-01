/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#000000",
          surface: "#121212",
          elevated: "#1A1A1A",
          chartreuse: "#CBFE01",
          moss: "#6E8901",
          blue: "#2300FF",
          muted: "#8A8A8A",
          border: "#2A2A2A",
        },
      },
      fontFamily: {
        sans: ["MuseoModerno"],
        "sans-medium": ["MuseoModerno-Medium"],
        "sans-semibold": ["MuseoModerno-SemiBold"],
        "sans-bold": ["MuseoModerno-Bold"],
      },
      borderRadius: {
        field: "14px",
        cta: "16px",
        card: "20px",
      },
    },
  },
  plugins: [],
};
