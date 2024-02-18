import type { Plugin } from 'vite';

export type Options = {
  fileRegex: RegExp | RegExp[];
};

export default function rawPlugin(options: Options): Plugin {
  return {
    name: 'raw-plugin',
    transform(code, id) {
      const fileRegex = options.fileRegex;
      if (Array.isArray(fileRegex) ? fileRegex.some((regexp) => regexp.test(id)) : fileRegex.test(id)) {
        const json = JSON.stringify(code)
          .replace(/\u2028/g, '\\u2028')
          .replace(/\u2029/g, '\\u2029');
        return {
          code: `export default ${json}`,
        };
      }
    },
  };
}
