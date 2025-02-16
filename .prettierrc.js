/** @type {import("prettier").Config} */
const config = {
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 120,
  tailwindStylesheet: './src/styles/style.css',
  plugins: [
    'prettier-plugin-tailwindcss',
    {
      languages: [
        {
          name: 'mustache-html',
          parsers: ['html'],
          extensions: ['.html.mustache'],
        },
      ],
    },
  ],
};
export default config;
