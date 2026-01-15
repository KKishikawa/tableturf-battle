/// <reference types="vitest" />
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import istanbul from 'vite-plugin-istanbul';

import PWA from './plugins/pwa';

/**@see {@link https://vitejs.dev/config} */
export default defineConfig(({ mode }) => {
  return {
    assetsInclude: ['**/*.mustache'],
    define: {
      'import.meta.vitest': 'undefined',
      NODE_ENV: `"${mode}"`,
    },
    publicDir: 'public',
    base: process.env.VITE_APP_PATH,
    resolve: {
      alias: {
        '@/': `${__dirname}/src/`,
      },
    },
    plugins: [
      tailwindcss(),
      PWA(),
      process.env.coverage
        ? istanbul({
            include: ['src/**/*'],
            exclude: ['node_modules'],
            requireEnv: false,
            forceBuildInstrument: true,
          })
        : [],
    ],
    test: {
      coverage: {
        enabled: true,
        provider: 'istanbul',
        include: ['src'],
        reportsDirectory: './vitest-coverage',
        reporter: ['json', 'html'],
      },
      include: ['tests/vitest/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    },
  };
});
