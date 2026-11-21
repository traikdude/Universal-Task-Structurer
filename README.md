![Loose notes and a whiteboard sketch flow through a brass clip into task cards with nested checkboxes.](assets/banner/banner.png)

# ✅ Universal Task Structurer

Turn meeting notes, whiteboard photos, or a web page into a checklist you can review before sending it to Google Tasks. Gemini drafts the tasks. You choose the destination list, or take the result with you as Markdown, CSV, or plain text.

**📑 Contents** · [Features](#-features) · [Quick start](#-quick-start) · [Usage](#-usage) · [Deployment](#-deployment) · [Repository layout](#-repository-layout) · [Status and testing](#-status-and-testing)

## 🔆 Features

| From capture to checklist | How it works |
| --- | --- |
| 📷 Read a whiteboard or PDF | Drop an image for English OCR with Tesseract. For a PDF, the importer reads each page’s embedded text. Scanned PDF pages need a text layer or an image export. [File importer](src/components/MultiFileUpload.tsx) |
| 🔗 Bring in a web page | Fetch a public URL to add its text and metadata to the input. The fetcher can use third-party proxies, so use public links. Pages that render entirely in JavaScript may yield little text. [URL importer](src/components/UrlInput.tsx) |
| 🎙️ Dictate a note | Use speech recognition in a supported browser. The Apps Script flow offers a separate dictation window for microphone access. [Voice input](src/components/VoiceInput.tsx) · [Dictation page](public/voice.html) |
| ✅ Structure and review | Gemini drafts task titles, priorities, due dates and subtasks. Review the cards and sort by priority in either light or dark mode. [Extraction instructions](src/constants/systemPrompt.ts) · [Workbench](src/App.tsx) |
| 📤 Send or export | Choose or create a Google Tasks list and confirm the send. For a portable copy, use the export menu. [Tasks service](src/services/googleTasks.ts) · [Confirmation](src/components/SendConfirmationModal.tsx) · [Export menu](src/components/ExportDropdown.tsx) |

## ⚡ Quick start

From the repository root, use Node.js and npm. For local development, set `VITE_GEMINI_API_KEY` in an untracked `.env.local`. To send tasks from the standalone app, also set `VITE_GOOGLE_CLIENT_ID` to your own web OAuth client ID, enable the Google Tasks API for that project, and authorize the local app’s origin.

```powershell
npm ci
npm run dev
```

Open the address Vite prints (the development script requests port 3000). Vite embeds browser-side settings in the client bundle. For a shared deployment that keeps the Gemini key on the server, use the Apps Script target below. [Package scripts](package.json) · [Gemini service](src/services/gemini.ts) · [OAuth setup](src/main.tsx)

## 🚀 Usage

1. Paste a note such as “Prepare the workshop by Friday. Reserve the room and print the handouts.” You can also start with an example, dictate, drop a file, or fetch a public page.
2. Select **⚡ Process Intelligence**. Check the proposed task breakdown and dates against the original note.
3. Copy the checklist as Markdown, export it, or select a Google Tasks list and confirm the send.

## 🏗️ Deployment

| Target | Build and configure |
| --- | --- |
| Standalone web app | Run `npm run build` and serve the resulting `dist/` directory on a static host. Use `npm run preview` for a local look at the build. Configure the browser settings above for the deployment origin. [Vite config](vite.config.ts) |
| Google Apps Script web app | Build without a browser Gemini key, then run `node build-gas.js`. It inlines the frontend and copies the server and manifest into `dist-gas/`. Deploy those files to **your own** Apps Script project as a web app. Set `GEMINI_API_KEY` in Script Properties and authorize the services declared in the manifest. The client calls server functions through `google.script.run`. [Builder](build-gas.js) · [Server](src/gas/Code.js) · [Manifest](appsscript.json) |

## 🧭 Repository layout

| Path | What lives there |
| --- | --- |
| [src/components](src/components) | React and TypeScript controls for capture, task cards, history, list selection and export |
| [src/lib](src/lib) | Task processing helpers and their Vitest tests |
| [src/services](src/services) | Gemini and Google Tasks adapters for the browser and Apps Script |
| [src/index.css](src/index.css) | Tailwind CSS and theme styles |
| [docs/releases](docs/releases) | Release notes, including the v1.9.0 dictation changes |
| [assets/banner](assets/banner) | README art, editable vector alternative and social preview |

## 🧪 Status and testing

Recurring task schedules and selectable instruction profiles remain roadmap ideas. The extraction instructions live in [one system prompt](src/constants/systemPrompt.ts). See the [v1.9.0 release notes](docs/releases/universal-task-v1.9.0.md) for the documented dictation changes.

After installing dependencies, run `npm run lint` for TypeScript checking and `npm test` for the [task-engine tests](src/lib/taskEngine.test.ts). Google sign-in, Gemini extraction and sending to a real task list require a configured environment for end-to-end testing.

## 🤝 Contributing

See the [contribution guide](CONTRIBUTING.md) for the project workflow.

## 📄 License

Released under the [MIT License](LICENSE).
