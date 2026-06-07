# 📦 Release Notes: universal-task-v1.7.0

## 📊 Version Summary
- **Tag:** `universal-task-v1.7.0`
- **Release Date:** 2026-06-07
- **Commit Hash:** `4201b49c1231acd5f2eafaaffeac46bc3ba1f865`
- **Target Branch:** `main`
- **GAS Deployment Version:** `64`

---

## 🚀 What's New in this Release

### 🎨 1. Premium Visual & Contrast Overhaul
- **Tailwind CSS v4 Dark Mode Variant:** Configured class-based dark mode variant switching using `@custom-variant` inside `index.css`. Toggling light/dark mode now applies all custom styles dynamically.
- **Widescreen Layout Expansion:** Expanded maximum page container width from `max-w-6xl` to `max-w-[1400px]` to utilize wider viewports and prevent content crowding.
- **TaskCard Legibility Improvements:** Replaced hardcoded light text properties with dynamic contrast parameters (`text-slate-900 dark:text-slate-100`) to resolve invisible white title text in light mode. Semi-transparent cards optimize contrast.

### 🔌 2. Smart Scraper Fallbacks (Firecrawl Alternative)
- **SPA & Dynamic Page Parsing:** Solved empty body crawl limitations on Single Page Applications (e.g. `dashboard.blaze.today`) by capturing HTML Title, meta description tags, and `application/ld+json` JSON-LD schema blocks before layout cleanup.
- **Multi-Proxy CORS Failover:** Implemented a resilient fallback request sequence (`corsproxy.io` -> `api.allorigins.win` -> direct fetch) to bypass local CORS policy restrictions during testing.
- **Cumulative Scraping:** Enabled cumulative text extraction in the main note board. Subsequent scrapes append data sequentially instead of overwriting prior notes.

### 🛡️ 3. Google Apps Script & CI/CD Pipeline
- **UTF-8 safe base64 Decoding:** Replaced classic string conversion in the build-compiler `build-gas.js` with `decodeURIComponent(escape(atob(b64)))` to resolve character mojibake corruption on script emojis.
- **Automated Workflow Actions:** Added ESLint type quality checks to standard CI pushes and created a weekly schedule (`security-audit.yml`) executing vulnerability reports on Sundays.

---

## 💾 Verification Checksums
- **Asset ZIP:** `universal-task-structurer-gas-v1.7.0.zip`
- **SHA256:** `F25172A5DD6E53829187D007F036265AA433E6093267BDD2C66E33C15B43F05D`
