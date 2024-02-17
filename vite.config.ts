import { defineConfig } from 'vite';

import { join } from 'node:path';

/**@see {@link https://vitejs.dev/config} */
export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.vitest': 'undefined',
    NODE_ENV: `"${mode}"`,
  },
  publicDir: 'public',
  resolve: {
    alias: {
      '@/': join(__dirname, 'src/')
    }
  },
}));
