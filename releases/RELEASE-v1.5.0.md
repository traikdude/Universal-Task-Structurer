# 🎉 Release v1.5.0 — Universal Task Structurer

## 📅 Release Information
- **Date:** Tuesday, April 15, 2026
- **Tag:** `universal-task-v1.5.0`
- **Commit:** `80b01d4`
- **Branch:** `main`

## 📋 Summary
This release is a **comprehensive visual redesign** of the Universal Task Structurer, transitioning
from the previous dark glassmorphism aesthetic to a clean, light-mode **Google-style "Joyful UI"**.
Every surface of the application has been rethought to maximize readability, approachability, and
delightful interactivity — all while retaining the full emoji-first philosophy established in v1.4.x.

## 🔄 Changes in This Release

### ✨ Added
- **Joyful UI Design System (`index.css`)** — Brand new light-mode token library:
  - `.joy-card` — clean white card with soft border + hover shadow lift
  - `.joy-input` — Google-style focus ring (blue, 2px)
  - `.joy-btn-primary` / `.joy-btn-ghost` — polished button variants
  - `.joy-pill` — colorful badge component
  - `.gradient-text` — blue→indigo gradient text utility
  - `.shimmer` — animated skeleton loading state
  - `.markdown-body` — full light-mode markdown reading styles
  - `@keyframes fade-in-up`, `bounce-in`, `wiggle`, `shimmer` — micro-animation tokens
- **Colorful ExampleChips** — 5 distinct pastel-themed pill chips (📅 blue · 🛒 emerald · 🚀 purple · 🩺 rose · 💡 amber) with hover shadow lifts and active scale press.
- **Light-mode MultiFileUpload** — Friendly dashed-border dropzone with playful emoji states, `"Drop it like it's hot! 🔥"` drag message, and color-coded file status cards (emerald/red/blue).
- **Redesigned UrlInput** — Clean white pill row with `🌐/✅/⚠️` emoji status indicators and `⚡ Fetch` button replacing the dark glass treatment.
- **Joyful Output Empty State** — 4-step pastel card guide (blue/purple/amber/emerald) with `🧠🎯✨` hero icon replacing the neon glow orb.

### 🔧 Changed
- **Root background** — `bg-slate-950` dark base → `bg-gray-50` clean light foundation with subtle blue/indigo radial gradients.
- **Header** — Dark glass `bg-slate-900/80 backdrop-blur-xl` → clean `bg-white border-gray-200 shadow-sm` with solid `bg-blue-600` icon, matching Google's Material Design language.
- **Textarea** — `text-slate-200 font-mono` → `text-gray-800 font-sans placeholder-gray-400` for natural readability.
- **Process button** — Neon cyan `bg-neon-cyan text-slate-950` → standard Google `bg-blue-600 text-white hover:bg-blue-700`.
- **Footer bar** — Dark `bg-slate-900/50` → clean `bg-white border-t border-gray-100`.
- **Intelligence Output header** — Neon dot label → clean `🧠 Intelligence Output` with `text-gray-700`.

### 🐛 Fixed
- **Placeholder visibility** — Textarea placeholder was invisible (dark-on-dark) in v1.4.x. Now renders correctly as `placeholder-gray-400` on white background. 👀
- **Chip contrast** — Example chips had low contrast in dark mode; redesigned with fully opaque pastel backgrounds.

## 🧪 Testing Performed
- Visual QA via local `npm run dev` confirmed on Chrome — all panels render correctly ✅
- Placeholder text visible in textarea ✅
- ExampleChips populate textarea on click ✅
- MultiFileUpload drag-and-drop activates correctly ✅
- UrlInput fetch flow renders ✅/⚠️ states correctly ✅
- Process button enables/disables on valid/invalid input ✅
- Build pushed to Vercel; production deployment confirmed ✅

## 📝 Notes
- The dark glassmorphism system (v1.4.x) has been fully replaced. All neon-cyan/slate tokens
  have been removed from the design system and replaced with the Joyful UI light-mode palette.
- The `isDarkMode` toggle in the header is still present but currently applies system-level semantics
  only. A future release could wire it to a true dark/light toggle.
- No breaking changes to the AI processing pipeline, Google Tasks OAuth, or Gemini model fallback chain.

## 🔗 Links
- Commit: https://github.com/traikdude/Universal-Task-Structurer/commit/80b01d4
- Tag: https://github.com/traikdude/Universal-Task-Structurer/releases/tag/universal-task-v1.5.0
- Live App: https://universal-task-structurer.vercel.app
