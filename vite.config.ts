import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';

export default defineConfig({
  
  plugins: [optimizeCssModules(), solid()],
  build: {
    minify: "esbuild",
    cssMinify: 'lightningcss'
  },
})
