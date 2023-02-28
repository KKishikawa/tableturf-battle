/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "'Noto Sans JP'", "'Noto Color Emoji'", "sans"],
      },
      fontSize: {

      }
    }
  },
  plugins: [],
}
