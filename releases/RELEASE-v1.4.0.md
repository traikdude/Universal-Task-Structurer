# 🎉 Release v1.4.0 — Universal Task Structurer

## 📅 Release Information
- **Date:** Thursday, April 10, 2026
- **Tag:** `universal-task-v1.4.0`
- **Commit:** `c35d114d100bcec880697e820757b92c164157ed`
- **Branch:** `main`

## 📋 Summary
This release significantly improves the reliability, usability, and resilience of Universal Task Structurer. The Gemini AI integration has been completely rewritten for production-grade fault tolerance, task scheduling now supports both date and time, and Google Tasks sync errors are communicated clearly to the user.

## 🔄 Changes in This Release

### ✨ Added
- **Time scheduling support** — Users can now set both a due date AND a due time on any task, fully integrated into the task editing workflow.
- **Playwright testing infrastructure** — Browser automation testing added to the project for future regression and E2E test coverage.
- **Google Tasks error surfacing** — When the app cannot connect or fetch task lists (e.g. due to an expired OAuth token), a clear inline error message is now shown, replacing the previous silent fallback.

### 🔧 Changed
- **Gemini AI service rewritten** — Complete overhaul with a 4-model fallback chain (`gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.0-flash-001` → `gemini-2.5-flash-lite`), exponential-backoff retry logic for transient errors (429/503), and smart skip logic for definitive failures (403/404).
- **Structured error logging** — All Gemini model attempts, retries, and failures are now emitted as structured `console.info/warn/error` logs for easier debugging.
- **Raw content sync on edit** — Updating a task's time now correctly patches the `rawContent` markdown in sync with the state, preventing stale data on export.

### 🐛 Fixed
- **Google Tasks list dropdown** — Custom lists were not showing if the OAuth session expired silently. Error is now surfaced immediately.
- **API key rotation** — Compromised API key fully rotated; new key verified against the complete Gemini model suite.

## 🧪 Testing Performed
- Automated Playwright end-to-end test: AI processing flow confirmed working (3 task cards rendered from Meeting Notes example)
- Direct API verification: `gemini-2.5-flash` confirmed as primary working model with the new key
- Build verification: `npm run build` passes with zero errors

## 📝 Notes
- If you experience task lists not loading, click **Send All to Google Tasks** to trigger a session expiry check. Re-authenticate via the **Connect Google Tasks** button.
- `.env.local` is correctly excluded from git history via `.gitignore`. No secrets are committed.

## 🔗 Links
- Commit: https://github.com/traikdude/Universal-Task-Structurer/commit/c35d114d100bcec880697e820757b92c164157ed
- Tag: https://github.com/traikdude/Universal-Task-Structurer/releases/tag/universal-task-v1.4.0
