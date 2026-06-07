<div align="center">

<img src="docs/assets/banner.png" alt="Universal Task Structurer Banner" width="100%">

# **✅ Universal Task Structurer**

**Turn messy notes, images, or URLs into perfectly structured Google Tasks using Gemini AI.**

[![Status](https://img.shields.io/badge/status-stable-6B8E5A?style=flat-square)](https://img.shields.io/badge/status-stable-6B8E5A?style=flat-square)
[![Version](https://img.shields.io/badge/version-1.7.0-C9A227?style=flat-square)](https://img.shields.io/badge/version-1.7.0-C9A227?style=flat-square)
[![License](https://img.shields.io/badge/license-MIT-1B4965?style=flat-square)](https://github.com/traikdude/Universal-Task-Structurer/blob/main/LICENSE)
[![Stack](https://img.shields.io/badge/stack-React%20%7C%20TypeScript-2B2B2B?style=flat-square)](https://img.shields.io/badge/stack-React%20%7C%20TypeScript-2B2B2B?style=flat-square)
[![Last Commit](https://img.shields.io/github/last-commit/traikdude/Universal-Task-Structurer?style=flat-square&color=1B4965)](https://img.shields.io/github/last-commit/traikdude/Universal-Task-Structurer?style=flat-square&color=1B4965)

</div>

---

## **✨ Overview**

Universal Task Structurer is a professional, AI-powered task extraction workbench that simplifies your productivity flow. By leveraging Gemini's generative intelligence, the application parses raw notes, whiteboard screenshots, meeting transcripts, or dynamic web page URLs and converts them into structured checklist actions. The application integrates directly with Google Tasks, enabling you to organize your personal, academic, or professional to-do lists in seconds.

## **📑 Table of Contents**

* [Features](#-features)
* [Visuals](#-visuals)
* [Quick Start](#-quick-start)
* [Installation](#-installation)
* [Usage](#-usage)
* [Configuration](#-configuration)
* [Architecture](#-architecture)
* [Roadmap](#-roadmap)
* [Testing](#-testing)
* [Contributing](#-contributing)
* [License](#-license)

## **🔆 Features**

* **AI-Powered Task Extraction** — Leverages Gemini models to automatically structure unstructured texts into actionable check-items with deadlines, subtasks, and priority scores.
* **Multimodal OCR Processing** — Drop whiteboards, handwritten lists, or PDFs directly onto the app interface to extract text magically.
* **Resilient URL Scraping** — Scrapes external websites using a multi-proxy fallback mechanism (`corsproxy.io` -> `api.allorigins.win`) with dedicated title, metadata, and JSON-LD schema parsing.
* **Direct Google Tasks Sync** — Authenticates with your Google account and exports structured cards directly into your official Google Tasks lists.
* **Premium Theme Control** — Responsive dark and light themes utilizing custom Tailwind CSS v4 variables with high-contrast widescreen support.

## **🖼️ Visuals**

* **Live Demo (Vercel hosting):** [https://universal-task-structurer.vercel.app](https://universal-task-structurer.vercel.app)
* **Google Apps Script Web App:** [https://script.google.com/macros/s/AKfycbzRCkuQUWi9FZ7UK2WSNk7nf0w0mEmPrNs9ArKYpIyDHfhMIubG1Zo5rl3ZDuCT00tN/exec](https://script.google.com/macros/s/AKfycbzRCkuQUWi9FZ7UK2WSNk7nf0w0mEmPrNs9ArKYpIyDHfhMIubG1Zo5rl3ZDuCT00tN/exec)

## **⚡ Quick Start**

To start the local development server immediately, run the following commands in your terminal:

```bash
git clone https://github.com/traikdude/Universal-Task-Structurer.git
cd Universal-Task-Structurer
npm install
npm run dev
```

Hold down **CTRL** and click the link displayed in the terminal (usually `http://localhost:3000/`) to open the local development workspace.

## **📦 Installation**

### **Prerequisites**
* [Node.js](https://nodejs.org/) (v20 or higher recommended)
* A [Gemini API Key](https://aistudio.google.com/)

### **Local Setup**
1. Clone this repository locally.
2. In the project root, create a file named `.env.local` containing:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GOOGLE_CLIENT_ID=825046261103-bkjr44l689qt0s9m4v3bj8te681pui11.apps.googleusercontent.com
   ```
3. Run `npm install` followed by `npm run dev`.

### **Deploying Online (Vercel)**
The application is pre-configured to deploy automatically on push. If setting up a fresh Vercel workspace:
1. Link your GitHub repository in [Vercel](https://vercel.com).
2. Configure your Environment Variables:
   * `VITE_GEMINI_API_KEY` = *(your Gemini key)*
   * `VITE_GOOGLE_CLIENT_ID` = `825046261103-bkjr44l689qt0s9m4v3bj8te681pui11.apps.googleusercontent.com`
3. Click **Deploy**.
4. **OAuth Configuration:** To enable Google Tasks sync online, go to your [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials) and add your Vercel URL under "Authorized JavaScript origins" and "Authorized redirect URIs".

---

## **🚀 Usage**

### **Extracting Tasks from Web Pages**
1. Open the application.
2. Paste any article or dashboard URL (e.g. `https://www.slashgear.com/886590/how-to-install-apks-on-your-chromebook/`) into the **🔗 Extract from URL** input field.
3. Click **⚡ Fetch**. TheParsed content will be appended into the text area.
4. Click **⚡ Process Intelligence**. Gemini will output structured tasks grouped by checklist cards on the right.
5. Click **📤 Send structured tasks to Google Tasks** to sync!

---

## **⚙️ Configuration**

The following environment parameters are required for operation:

| Option | Default | Description |
| ----- | ----- | ----- |
| `VITE_GEMINI_API_KEY` | *(None)* | Your active Gemini API authorization token |
| `VITE_GOOGLE_CLIENT_ID` | `82504626...` | Google Client ID for OAuth Tasks integration |

---

## **🏗️ Architecture**

The project supports a dual-target architecture:
1. **Single-Page Application (SPA):** A standard client-side React bundle optimized for Vercel deployment.
2. **Google Apps Script Web App:** An inline, base64-encoded single-file bundle compiled via `build-gas.js`. In this mode, the client communicates directly with Google's backend APIs natively via `google.script.run` proxies, bypassing cross-origin blocks and authentication limitations.

---

## **🗺️ Roadmap**

* [x] Add dynamic metadata/schema scraping fallbacks for SPA dashboards.
* [x] Implement multi-proxy failovers to bypass local CORS policies.
* [x] Enable Tailwind CSS v4 selector-based dark mode theme switches.
* [x] Establish CI workflows for linting and security scans.
* [ ] Add automated task recurrence schedules. 🔜
* [ ] Support multiple Gemini system instruction profile options. 🔜

---

## **🧪 Testing**

To execute the unit test suites:
```bash
npm run test
```

---

## **🤝 Contributing**

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our coding standards and review processes.

---

## **📄 License**

This project is released under the MIT License. See [LICENSE](LICENSE) for the full text.

---

<div align="center">

🏛️ *Part of the Brigade* · Built by **Erik** · <sub>Forged with care</sub>

</div>
