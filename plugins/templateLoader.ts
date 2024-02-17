import type { Plugin } from 'vite';

export default function templateLoader(): Plugin {
  const filter = /\.template\.(html|svg)$/;

  return {
    name: 'template-loader',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolution = await this.resolve(source, importer, options);
      console.log("resolution", resolution);
      console.log("resolution", options);
      if (!resolution || resolution.external) return resolution;
      if (filter.test(resolution.id)) {
        return `${resolution.id}?raw`;
      }
      return null;
    }
  }
}
