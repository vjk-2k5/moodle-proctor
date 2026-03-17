/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#050816",
        surface: "#0B1120",
        surfaceMuted: "#020617",
        accent: {
          blue: "#38BDF8",
          green: "#22C55E",
          yellow: "#EAB308",
          red: "#EF4444"
        }
      },
      boxShadow: {
        soft: "0 18px 40px rgba(15,23,42,0.9)"
      }
    }
  },
  plugins: []
};

