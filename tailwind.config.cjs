/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['index.html', './src/**/*.{html.mustache,js,ts,svelte}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', "'Noto Sans JP'", "'Noto Color Emoji'", 'sans'],
      },
      fontSize: {},
    },
  },
  plugins: [],
};
