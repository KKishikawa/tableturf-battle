import { defineConfig, loadEnv } from 'vite';

import { join } from 'node:path';
import PWA from './plugins/pwa';

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
        '@/': join(__dirname, 'src/')
      }
    },
    plugins: [
      PWA(),
    ],
  }
});
