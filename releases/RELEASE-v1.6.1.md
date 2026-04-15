# 🤖 Release v1.6.1 — Universal Task Structurer

## 📅 Release Information
- **Date:** Tuesday, April 15, 2026 at 6:52 PM EST
- **Tag:** `universal-task-v1.6.1`
- **Commit:** `2c46044d2668bfc00087e28f519711231d80f01f`
- **Branch:** `main`
- **Type:** 🟢 PATCH — Targeted correction, backward-compatible

## 📦 Changed Files
- `index.html` — Meta tag correction (iOS removed → Android added)
- `public/manifest.json` — New file: Android PWA Web App Manifest

## 📋 Summary
Corrects the mobile meta configuration introduced in v1.6.0.
The v1.6.0 release included iOS-specific meta tags (`apple-mobile-web-app-*`)
and a `maximum-scale=1` zoom lock that are irrelevant and harmful on Android.
This patch replaces them with the correct **Android/Chrome PWA standard**.

## 🔄 Changes in This Release

### ✨ Added
- **`public/manifest.json`** — Web App Manifest for Android/Chrome PWA:
  - `display: standalone` — no browser address bar when launched from home screen
  - `theme_color: #2563eb` — Android status bar turns app-blue when open
  - `background_color: #f9fafb` — matches app's light-mode background (no flash)
  - Maskable SVG checkmark icons at 192×192 and 512×512 (all densities)
  - **App Shortcut**: long-pressing the home screen icon reveals a "New Task" quick action
  - `categories: ["productivity", "utilities"]` — proper Play Store / Chrome Web Store classification
- **`<meta name="mobile-web-app-capable">`** — Chrome on Android install trigger
- **`<link rel="manifest">`** — wires index.html to the PWA manifest

### 🔧 Changed
- **`maximum-scale=1` removed** — This was an iOS anti-zoom hack. On Android it violates
  user accessibility preferences; Chrome correctly manages zoom behavior natively.
- **`viewport-fit=cover` retained** — Still valid on Android devices with punch-hole cameras /
  display cutouts (e.g., Pixel, Galaxy S series).

### 🐛 Fixed
- **Removed `apple-mobile-web-app-capable`** — iOS Safari only; no effect on Android
- **Removed `apple-mobile-web-app-status-bar-style`** — iOS Safari only
- **Removed `apple-mobile-web-app-title`** — iOS Safari only; would show incorrect metadata
  in any Android PWA install prompt

## 🧪 Testing Notes
- `manifest.json` validated against W3C Web App Manifest spec
- All icon `src` values use inline SVG data URIs — no external asset dependency
- `display: standalone` confirmed compatible with Chrome for Android v106+
- No visual changes to desktop or mobile layout — purely meta/manifest layer

## 📱 Android Install Instructions
1. Open **https://universal-task-structurer.vercel.app** in **Chrome for Android**
2. Tap ⋮ menu → **"Add to Home screen"**
3. Tap **Add** — launches standalone (no browser UI) with blue status bar
4. **Long-press** the home icon → tap **"New Task"** shortcut

## 📝 Notes
- No changes to application logic, layout, or design system
- Desktop experience completely unaffected
- v1.6.0 mobile tab navigation, auto-switch, and ExampleChips scroll are all intact

## 🔗 Links
- Commit: https://github.com/traikdude/Universal-Task-Structurer/commit/2c46044d2668bfc00087e28f519711231d80f01f
- Tag: https://github.com/traikdude/Universal-Task-Structurer/releases/tag/universal-task-v1.6.1
- Live App: https://universal-task-structurer.vercel.app
