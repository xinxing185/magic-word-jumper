<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Magic Word Jumper

[简体中文](./README.zh-CN.md)

Magic Word Jumper is a Vite + React app with Vercel Serverless API routes for AI calls. DeepSeek is the default local provider, and Gemini can still be enabled with `AI_PROVIDER=gemini`. Keep provider API keys on the server only; do not expose them to the browser bundle.

View your app in AI Studio: https://ai.studio/apps/drive/1sTlBv0HsFtnS1dF-nolQTzeykmk5BJRh

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```sh
   npm install
   ```

2. Set AI provider environment variables in `.env.local`.

   DeepSeek:

   ```sh
   AI_PROVIDER=deepseek
   DEEPSEEK_API_KEY=...
   ```

   Gemini:

   ```sh
   AI_PROVIDER=gemini
   GEMINI_API_KEY=...
   ```

3. Run the app with Vercel's local dev server:

   ```sh
   npm run dev
   ```

`npm run dev` starts the Vite frontend and Vercel Serverless API routes together, so `/api/word-bank` and `/api/encouragement` are available at the same local origin.
It also loads `.env.local` before starting Vercel Dev, so server-side AI keys are available to the local API functions.

For pure frontend UI work only, run:

```sh
npm run dev:vite
```

That starts Vite directly and does not serve `/api/*` routes.

## Deploy to Vercel

1. Push this project to GitHub.
2. Create a Vercel project from the repository.
3. Use the Vite defaults:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add the provider environment variables in Vercel project settings.
5. Deploy.

For local Vercel dev and Vercel production, leave `VITE_API_BASE_URL` unset. The app defaults to `/api`.

## Deploy to Tencent CloudBase

CloudBase deployment uses the Vite build for the static site and a separate HTTP cloud function for `/api/*`.

### HTTP Cloud Function

Deploy `cloudbase/functions/api` as a CloudBase HTTP cloud function or Web function. The upload zip must have these files at the archive root:

- `index.js`
- `server.js`
- `package.json`
- `scf_bootstrap`

Recommended function settings:

- Runtime: Node.js 18 or Node.js 20
- Timeout: 60 seconds
- Memory: 512 MB

Environment variables:

- `AI_PROVIDER=deepseek`
- `DEEPSEEK_API_KEY=...`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-chat`

Optional Gemini fallback variables:

- `GEMINI_API_KEY=...`
- `GEMINI_WORD_BANK_MODEL=gemini-2.5-flash-lite`
- `GEMINI_ENCOURAGEMENT_MODEL=gemini-3-flash-preview`

Configure the CloudBase HTTP route:

- Route path: `/api`
- Resource: the uploaded cloud function
- Path passthrough: enabled
- Auth: disabled

Do not set `Access-Control-Allow-Origin` in function code when CloudBase already injects the request origin; duplicate origin values will make browser CORS fail.

After deployment, test the function:

- `POST <cloud-function-domain>/api/health`
- `POST <cloud-function-domain>/api/encouragement`
- `POST <cloud-function-domain>/api/word-bank`

### Static Hosting

Build the frontend with the CloudBase HTTP route as the API base:

```sh
VITE_API_BASE_URL=https://<your-cloudbase-app-domain>/api npm run build
```

Then upload the generated `dist` contents to CloudBase Static Website Hosting as a static site.

For static file upload:

- Framework: Other/static
- Install command: empty
- Build command: empty
- Build output directory: `./`
- Deploy path: `/`

In other words, choose "Other/static", leave install and build commands empty, and deploy the already-built static files directly. Do not ask CloudBase to run `npm install` or `npm run build` again for `dist`.

For local Vercel dev and Vercel production, leave `VITE_API_BASE_URL` unset. The app defaults to `/api`.

After static deployment, test:

- Open the CloudBase static hosting domain.
- Pick a level and verify the word bank loads.
- Finish a game and verify the encouragement message loads.
