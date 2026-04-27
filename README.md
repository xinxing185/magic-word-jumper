<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Magic Word Jumper

This is a Vite + React app with Vercel Serverless API routes for Gemini calls. Keep `GEMINI_API_KEY` on the server only; do not expose it to the browser bundle.

View your app in AI Studio: https://ai.studio/apps/drive/1sTlBv0HsFtnS1dF-nolQTzeykmk5BJRh

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local`.
3. Run the app with Vercel's local dev server so `/api/*` routes are available:
   `npx vercel dev`

`npm run dev` starts only the Vite frontend and will not serve the Vercel API routes.

## Deploy to Vercel

1. Push this project to GitHub.
2. Create a Vercel project from the repository.
3. Use the Vite defaults:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add the environment variable `GEMINI_API_KEY` in Vercel project settings.
5. Deploy.
