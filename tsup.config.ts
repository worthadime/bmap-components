import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2019',
  treeshake: true,
  // react 系由使用方提供（peerDependencies），不打入产物
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  loader: {
    // 图标 base64 内联，使用方零静态资源配置
    '.png': 'dataurl',
    // vendor 脚本（mapvgl / LuShu）以纯文本打入独立 chunk，运行时经 Blob URL 注入
    '.txt': 'text',
  },
});
