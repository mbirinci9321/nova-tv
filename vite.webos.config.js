import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist-webos', target: 'chrome87',
    lib: { entry: 'src/main.js', name: 'MbirinciTV', formats: ['iife'], fileName: ()=>'app.js', cssFileName:'style' },
  },
});
