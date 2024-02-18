import { mergeConfig, defineConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        globals: true,
        coverage: {
          enabled: true,
          provider: 'v8',
          include: ['src'],
        },
      },
    }),
  ),
);
