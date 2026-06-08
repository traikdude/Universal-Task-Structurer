# 📦 Release Notes: universal-task-v1.9.0

## 📊 Version Summary
- **Tag:** `universal-task-v1.9.0`
- **Release Date:** 2026-06-07
- **Commit Hash:** `3e8877174e92a938634ca6a908235eead13f2824`
- **Target Branch:** `main`
- **GAS Deployment Version:** `66`

---

## 🚀 What's New in this Release

### 🎙️ 1. Sandboxed Apps Script Microphone Popup Workaround
- **Cross-Origin Iframe Solution:** Added a standalone, modern dictation helper page `voice.html` that runs in a top-level window. This bypasses the sandboxed Apps Script iframe's lack of `allow="microphone"` attributes, permitting normal permission dialog triggers.
- **HTML5 postMessage Pipeline:** Configured a secure window messaging channel to transmit text transcripts seamlessly back to the sandboxed React application window.

### 🔍 2. Real-Time Speech Recognition Diagnostics Console
- **Edge Dictation Debugging:** Hooked the dictation helper into SpeechRecognition API lifecycle listeners (`onerror`, `onaudiostart`, `onsoundstart`, `onspeechstart`, `onresult`, `onend`).
- **Interactive Console Output:** Created a diagnostic panel at the bottom of `voice.html` to log state transitions and failure strings (like `network` or `not-allowed`) for instant debugging of Edge tracking prevention policies.

### 🔑 3. Google OAuth GSI Client ID Startup Patches
- **Safe Initialization Fallback:** Implemented a valid dummy Client ID fallback (`dummy-client-id.apps.googleusercontent.com`) to prevent the google-auth-library from throwing fatal startup errors when the production environment lacks client credentials.

### 🗃️ 4. Local & Remote Troubleshooting Ledger Catalog
- **Historical Session Logging:** Appended records TDB-013 through TDB-016 to the project's centralized troubleshooting ledger to preserve development context.

---

## 💾 Verification Checksums
- **Asset ZIP:** `universal-task-structurer-gas-v1.9.0.zip`
- **SHA256:** `2F8107686D0C00625444D470B7E70EF7AF940404DA56E37A32A814D67D5A6A9B`
