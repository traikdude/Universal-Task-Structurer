<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

[![Live on Vercel](https://img.shields.io/badge/Live%20Demo-universal--task--structurer.vercel.app-black?style=for-the-badge&logo=vercel)](https://universal-task-structurer.vercel.app)
</div>

# Universal Task Structurer

A professional AI-powered task extraction app that turns messy notes, images, or URLs into perfectly structured Google Tasks.

🌐 **Live App:** [https://universal-task-structurer.vercel.app](https://universal-task-structurer.vercel.app)

Originally exported from Google AI Studio, this project has been fully enhanced into a production-ready React / Vite application.

## 💻 1. How to run this locally (on your computer)

Whenever you restart your computer or close your windows, you can always get back to the app by following these steps:

### Prerequisites:
- You must have [Node.js](https://nodejs.org/) installed.
- Open **Terminal** (or PowerShell/Command Prompt).

### Steps:
1. **Navigate to the project folder:**
   Make sure your terminal is in the project directory:
   ```bash
   cd "C:\Users\traik\.gemini\antigravity\Github Repo\Universal-Task-Structurer\Universal-Task-Structurer"
   ```

2. **Start the development server:**
   Simply run this command to start it back up:
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   The terminal will display a URL (usually `http://localhost:3000/`). Hold down **CTRL** and click the link to open it in your browser.

> **Note on Environment Variables:** You must have a `.env.local` file in this folder containing your `VITE_GEMINI_API_KEY` and `VITE_GOOGLE_CLIENT_ID`. (This is already set up for you).

---

## 🌐 2. How to deploy this online (Free hosting!)

If you want to be able to use your app from your phone anywhere in the world WITHOUT having to run the local server on your computer, you can deploy it to **Vercel** for free.

**The app is already deployed at: [https://universal-task-structurer.vercel.app](https://universal-task-structurer.vercel.app)**

Future deployments are **automatic** — every `git push` to `main` triggers a new Vercel build with no manual steps required.

If you ever need to set up a fresh Vercel deployment:

1. Go to [Vercel.com](https://vercel.com/) and sign in with your **GitHub** account.
2. Click **"Add New... → Project"** and import `Universal-Task-Structurer`.
3. Leave the Framework Preset as **"Vite"** (auto-detected).
4. Add these two **Environment Variables**:
   - Key: `VITE_GEMINI_API_KEY` | Value: *(your Gemini API key from .env.local)*
   - Key: `VITE_GOOGLE_CLIENT_ID` | Value: `825046261103-bkjr44l689qt0s9m4v3bj8te681pui11.apps.googleusercontent.com`
5. Click **Deploy** — live in ~90 seconds.

### Important Google Auth Step for Online Hosting:
When you get your new Vercel URL, you will need to add it to your Google Cloud Console so the Google Tasks login button still works:
1. Go to your [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Web Client
3. Under "Authorized JavaScript origins", click **ADD URI** and paste your Vercel URL.
4. Under "Authorized redirect URIs", click **ADD URI** and paste your Vercel URL.
5. Save changes.

Now your app is fully online, auto-updates every time you push to GitHub, and can be accessed from any device!
