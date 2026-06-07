import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Legacy: AI Studio export uses process.env.GEMINI_API_KEY.
      // Kept for backward compatibility with existing code paths.
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    envPrefix: ['VITE_'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },

    // ── GAS Production Build Configuration ──────────────────────────
    // Google Apps Script HTML Service runs inside a sandboxed iframe that
    // BLOCKS: type="module" scripts, eval(), Function(), dynamic import()
    // ALLOWS: inline <script> tags, inline <style> tags
    //
    // These settings produce a single IIFE JS bundle + single CSS file
    // that the build-gas.js post-processor inlines into index.html.
    build: {
      target: 'es2020', // GAS V8 runtime supports ES2020
      cssCodeSplit: false, // Single CSS file (no per-chunk CSS)
      assetsInlineLimit: 100000000, // Inline all assets as base64 data URIs
      rollupOptions: {
        output: {
          format: 'iife', // CRITICAL: Self-executing function, NOT ESM
          inlineDynamicImports: true, // No code splitting — single bundle
          entryFileNames: 'assets/app.js', // Predictable filename (no hash)
          assetFileNames: 'assets/[name].[ext]', // Predictable asset names
        },
      },
    },
  };
});
