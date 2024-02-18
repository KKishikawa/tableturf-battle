/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import { join } from 'node:path';
import istanbul from 'vite-plugin-istanbul';

import PWA from './plugins/pwa';
import rawPlugin from './plugins/rawPlugin';

/**@see {@link https://vitejs.dev/config} */
export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  return {
    define: {
      'import.meta.vitest': 'undefined',
      NODE_ENV: `"${mode}"`,
    },
    publicDir: 'public',
    base: process.env.VITE_APP_PATH,
    resolve: {
      alias: {
        '@/': join(__dirname, 'src/'),
      },
    },
    plugins: [
      PWA(),
      rawPlugin({
        fileRegex: /\.mustache$/,
      }),
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
