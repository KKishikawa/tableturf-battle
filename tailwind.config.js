/* eslint-disable @typescript-eslint/no-var-requires */
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "'Noto Sans JP'",...defaultTheme.fontFamily.sans, "sans"],
      },
      fontSize: {

      }
    }
  },
  plugins: [],
}
