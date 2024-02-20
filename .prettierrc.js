/** @type {import("prettier").Config} */
const config = {
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 120,
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
