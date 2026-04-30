# Deploy Cloudflare Pages Static Site with Tencent CloudBase API

This deployment keeps the Vite frontend on Cloudflare Pages and keeps the AI API on Tencent CloudBase.

## Architecture

- Cloudflare Pages serves the static `dist` frontend.
- Tencent CloudBase serves `/api/health`, `/api/word-bank`, and `/api/encouragement`.
- The browser calls CloudBase directly through `VITE_API_BASE_URL`.
- AI provider keys stay in CloudBase function environment variables only.

## CloudBase Preparation

Deploy `cloudbase/functions/api` as the HTTP cloud function or Web function.

Required CloudBase environment variables:

```sh
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

Optional Gemini variables:

```sh
GEMINI_API_KEY=...
GEMINI_WORD_BANK_MODEL=gemini-2.5-flash-lite
GEMINI_ENCOURAGEMENT_MODEL=gemini-3-flash-preview
```

If CloudBase does not inject CORS headers for your HTTP route, add this CloudBase function environment variable:

```sh
CORS_ALLOWED_ORIGINS=https://<your-cloudflare-project>.pages.dev,https://<your-custom-domain>
```

Use only the origins that should be allowed to call the API. Do not set this if CloudBase already injects `Access-Control-Allow-Origin`, because duplicate origin headers can make browser CORS fail.

Test the deployed function:

```sh
curl -i -X POST https://<your-cloudbase-app-domain>/api/health
curl -i -X POST https://<your-cloudbase-app-domain>/api/word-bank \
  -H 'Content-Type: application/json' \
  --data '{"levelId":"raz-aa-a"}'
curl -i -X POST https://<your-cloudbase-app-domain>/api/encouragement \
  -H 'Content-Type: application/json' \
  --data '{"score":8,"total":10}'
```

## Cloudflare Pages Setup

Create a Cloudflare Pages project from the Git repository.

Use these build settings:

- Root directory: `magic-word-jumper` if the repository root is the parent folder.
- Build command: `npm run build`
- Build output directory: `dist`

Add this Cloudflare Pages environment variable:

```sh
VITE_API_BASE_URL=https://<your-cloudbase-app-domain>/api
```

This is a build-time variable. Redeploy the Pages project after changing it.

Do not add `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, or any other server-side AI secret to Cloudflare Pages for this deployment.

## Local Build Check

Run a production build against the CloudBase API domain:

```sh
VITE_API_BASE_URL=https://<your-cloudbase-app-domain>/api npm run build
```

Preview the static output if needed:

```sh
npm run preview
```

## Acceptance Checks

- CloudBase API endpoints return successful JSON responses.
- Cloudflare Pages deploy succeeds.
- The game loads from the Cloudflare Pages URL.
- Browser DevTools shows API calls going to `https://<your-cloudbase-app-domain>/api/...`.
- Picking a level loads a generated word bank.
- Finishing a game loads an AI encouragement message.
- If the browser reports a CORS error, configure CloudBase route CORS or set `CORS_ALLOWED_ORIGINS` on the CloudBase function.

## Mainland China Notes

Users should not need a VPN, because the app is public web traffic. However, ordinary Cloudflare Pages is not the same as Cloudflare China Network. If mainland China stability is critical, keep a CloudBase static hosting deployment as the mainland entrypoint or evaluate Cloudflare China Network with ICP requirements.
