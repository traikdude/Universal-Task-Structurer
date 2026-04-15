# 📱 Release v1.6.0 — Universal Task Structurer

## 📅 Release Information
- **Date:** Tuesday, April 15, 2026
- **Tag:** `universal-task-v1.6.0`
- **Commit:** `eefc507`
- **Branch:** `main`

## 📋 Summary
This release delivers a **full mobile-first responsive redesign** of the Universal Task Structurer.
The app previously required a laptop-width screen to use comfortably. It now works beautifully on
any phone or tablet, with a native-feeling tab navigation system, auto-switching UX, and complete
iPhone/Safari compatibility.

## 🔄 Changes in This Release

### ✨ Added
- **📱 Mobile Tab Bar** — A sticky `✏️ Input / 🧠 Output` switcher appears below the header on screens
  smaller than `lg` (1024px). Desktop retains the original side-by-side two-column layout.
- **🔢 Live Task Count Badge** — The Output tab shows a blue pill badge with the discovered task count
  as soon as processing completes.
- **⚡ Auto-Tab Switch** — A `useEffect` hook automatically flips the active tab to Output the moment
  AI processing finishes with results — zero manual taps required on mobile.
- **📐 `xs` Breakpoint (480px)** — Added `--breakpoint-xs: 30rem` to the Tailwind v4 `@theme` block
  for fine-grained control between mobile and `sm` (640px).
- **📜 Scrollbar-none utility** — `.scrollbar-none` CSS class hides the scrollbar on the horizontal
  chip scroll row across all browsers.
- **🍎 iPhone Safe-Area Support** — `viewport-fit=cover` in `index.html` fills the notch area.
  `.safe-bottom` utility class added for future safe-area-inset padding needs.
- **🏠 Apple Web App Meta Tags** — `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
  and `apple-mobile-web-app-title` added so the app feels native when saved to the iOS Home Screen.

### 🔧 Changed
- **Main layout** — `grid grid-cols-1 lg:grid-cols-2` replaces the rigid two-column grid to allow
  mobile stacking. Both columns are controlled by `hidden lg:flex` / `flex` visibility via `activeTab` state.
- **Column heights** — `h-[calc(100vh-8rem)]` is scoped to `lg:` only; mobile uses natural document flow.
- **Header** — Compact on mobile: smaller icon/padding, subtitle hidden below `sm:`, "Connect Google Tasks"
  abbreviated to "🔗 Tasks" on small screens.
- **ExampleChips** — Horizontal scroll on mobile (`overflow-x-auto`), wraps on `sm+`.
- **Output panel wrapper** — Migrated from leftover `glass-panel` (dark) to `joy-card` (light).
- **Sort bar** — Replaced neon-cyan dark tokens with clean `bg-gray-50 border-gray-200` and
  blue active-state pills (`bg-blue-50 text-blue-600`).
- **Undo/Redo buttons** — `hover:text-neon-cyan hover:bg-slate-800` → `hover:text-blue-600 hover:bg-blue-50`.
- **Processing overlay** — `bg-slate-900/40` dark blur → `bg-white/90` light blur with blue spinner.
- **Error state** — Dark glass card → clean `bg-red-50 border-red-200` light card.
- **Textarea** — `min-h-[180px] lg:flex-1` allows comfortable input on mobile without requiring scroll.
- **`maximum-scale=1`** — Added to viewport meta to prevent iOS from auto-zooming on `<textarea>` focus.

### 🐛 Fixed
- **Output panel dark remnants** — Remaining `glass-panel`, `bg-slate-950/20`, and `text-neon-*` 
  tokens in the output section have been replaced with light-mode equivalents.
- **"Select All" button** — Was styled with `text-neon-cyan` (invisible on white); now `text-blue-600`.

## 🧪 Testing Performed
- Layout verified on mobile viewport (375px iPhone SE width) — tab switcher renders correctly ✅
- Auto-tab-switch useEffect confirmed fires after `isProcessing → false` ✅
- ExampleChips horizontal scroll functional with scrollbar hidden ✅
- Header does not overflow at 320px minimum width ✅
- Sort bar light colors confirmed ✅
- Build pushed to Vercel; production deployment confirmed ✅

## 📝 Notes
- The desktop experience is **unchanged** — the two-column layout, fixed viewport heights, and
  all interactions remain identical above the `lg` (1024px) breakpoint.
- The `isDarkMode` toggle is still wired to Tailwind's color-scheme preference. A true
  dark/light runtime toggle is a future enhancement opportunity.

## 🔗 Links
- Commit: https://github.com/traikdude/Universal-Task-Structurer/commit/eefc507
- Tag: https://github.com/traikdude/Universal-Task-Structurer/releases/tag/universal-task-v1.6.0
- Live App: https://universal-task-structurer.vercel.app
