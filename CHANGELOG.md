# 📊 Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.7.0] - 2026-06-07

### Added
- **Multi-Proxy CORS Fallback:** Created a tiered loader trying `corsproxy.io` first, then `api.allorigins.win`, and direct fetch, resolving local development extraction blocks.
- **Dynamic SPA Scraper support:** Enabled capture of Title, Description, and JSON-LD structured script data to successfully crawl dynamic Single Page Applications (like Text Blaze Dashboard).
- **Weekly Security Scans:** Set up `security-audit.yml` GitHub workflow executing NPM audits weekly on Sundays.
- **ESLint Quality Verification:** Configured ESLint code quality scan step in main CI checks.

### Changed
- **Tailwind CSS v4 Dark Mode Toggle:** Configured `@custom-variant` inside `index.css` to enable responsive dark theme rendering on html/body element selector triggers.
- **Layout Expansion:** Expanded App viewport grid wrapper from `max-w-6xl` to `max-w-[1400px]` for widescreen layout improvements.
- **TaskCard legibility:** Upgraded title text classes to dynamic contrasts (`text-slate-900 dark:text-slate-100`) to resolve light mode invisible text bugs.

---

## [1.6.1] - 2026-04-15

### Fixed
- **UTF-8 safe base64 decoding:** Patched compilation bundle in `build-gas.js` with `decodeURIComponent(escape(atob(b64)))` to resolve character/emoji mojibake issues on deployment.
- **Apps Script Async Mount Check:** Resolved race condition by polling for `(window as any).google?.script?.run` asynchronously on page mount.
- **Google Tasks auth integration:** Fixed authorization redirects and scoped task list queries.
