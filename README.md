<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Magic Word Jumper

This is a Vite + React app with Vercel Serverless API routes for AI calls. DeepSeek is the default local provider, and Gemini can still be enabled with `AI_PROVIDER=gemini`. Keep provider API keys on the server only; do not expose them to the browser bundle.

这是一个 Vite + React 应用，包含用于 AI 调用的服务端 API。当前默认使用 DeepSeek，也保留 Gemini 方案，可通过 `AI_PROVIDER=gemini` 切换。所有模型 API Key 都必须只放在服务端环境变量中，不要暴露到浏览器前端。

View your app in AI Studio: https://ai.studio/apps/drive/1sTlBv0HsFtnS1dF-nolQTzeykmk5BJRh

## Run Locally

## 本地运行

**Prerequisites:** Node.js

**前置条件：** Node.js

1. Install dependencies:
   `npm install`
   安装依赖：
   `npm install`
2. Set AI provider environment variables in `.env.local`.
   - DeepSeek: `AI_PROVIDER=deepseek` and `DEEPSEEK_API_KEY=...`
   - Gemini: `AI_PROVIDER=gemini` and `GEMINI_API_KEY=...`
   在 `.env.local` 中配置 AI 服务环境变量：
   - DeepSeek: `AI_PROVIDER=deepseek` 和 `DEEPSEEK_API_KEY=...`
   - Gemini: `AI_PROVIDER=gemini` 和 `GEMINI_API_KEY=...`
3. Run the app with Vercel's local dev server:
   `npm run dev`
   使用 Vercel 本地开发服务器运行：
   `npm run dev`

`npm run dev` starts the Vite frontend and Vercel Serverless API routes together, so `/api/word-bank` and `/api/encouragement` are available at the same local origin.
It also loads `.env.local` before starting Vercel Dev, so server-side AI keys are available to the local API functions.

`npm run dev` 会同时启动 Vite 前端和 Vercel Serverless API，因此 `/api/word-bank` 和 `/api/encouragement` 会在同一个本地域名下可用。启动前会加载 `.env.local`，所以服务端 API 可以读取 DeepSeek/Gemini 的环境变量。

For pure frontend UI work only, run `npm run dev:vite`. That starts Vite directly and does not serve `/api/*` routes.

如果只改前端 UI，可以运行 `npm run dev:vite`。这个命令只启动 Vite，不提供 `/api/*` 服务。

## Deploy to Vercel

## 部署到 Vercel

1. Push this project to GitHub.
2. Create a Vercel project from the repository.
3. Use the Vite defaults:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add the provider environment variables in Vercel project settings.
5. Deploy.

中文步骤：

1. 将项目推送到 GitHub。
2. 在 Vercel 中从仓库创建项目。
3. 使用 Vite 默认配置：
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 在 Vercel 项目环境变量中添加 AI 服务变量。
5. 部署。

Vercel 本地和线上都不需要设置 `VITE_API_BASE_URL`，默认会请求同域名下的 `/api`。

## Deploy to Tencent CloudBase

## 部署到腾讯云 CloudBase

CloudBase deployment uses the Vite build for the static site and a separate HTTP cloud function for `/api/*`.

CloudBase 部署分成两部分：静态网站托管部署前端，HTTP 云函数提供 `/api/*` 接口。没有备案域名时，可以先使用 CloudBase 默认域名。

### HTTP cloud function

### HTTP 云函数

Deploy `cloudbase/functions/api` as a CloudBase HTTP cloud function or Web function. The upload zip must have these files at the archive root:

将 `cloudbase/functions/api` 部署为 CloudBase HTTP 云函数或 Web 函数。上传压缩包根目录必须包含：

- `index.js`
- `server.js`
- `package.json`
- `scf_bootstrap`

Recommended function settings:

推荐函数配置：

- Runtime: Node.js 18 or Node.js 20
- Timeout: 60 seconds
- Memory: 512 MB

Environment variables:

环境变量：

- `AI_PROVIDER=deepseek`
- `DEEPSEEK_API_KEY=...`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-chat`

Optional Gemini fallback variables:

可选 Gemini 备用环境变量：

- `GEMINI_API_KEY=...`
- `GEMINI_WORD_BANK_MODEL=gemini-2.5-flash-lite`
- `GEMINI_ENCOURAGEMENT_MODEL=gemini-3-flash-preview`

Configure the CloudBase HTTP route:

配置 CloudBase HTTP 访问路由：

- Route path: `/api`
- Resource: the uploaded cloud function
- Path passthrough: enabled
- Auth: disabled

Do not set `Access-Control-Allow-Origin` in function code when CloudBase already injects the request origin; duplicate origin values will make browser CORS fail.

如果 CloudBase 网关已经自动注入请求来源，不要在函数代码里再设置 `Access-Control-Allow-Origin`，否则浏览器会因为出现多个 origin 值而拦截 CORS 请求。

After deployment, test the function:

函数部署后测试：

- `POST <cloud-function-domain>/api/health`
- `POST <cloud-function-domain>/api/encouragement`
- `POST <cloud-function-domain>/api/word-bank`

### Static hosting

### 静态网站托管

Build the frontend with the CloudBase HTTP route as the API base:

构建前端时，将 CloudBase HTTP 路由作为 API Base：

`VITE_API_BASE_URL=https://<your-cloudbase-app-domain>/api npm run build`

Then upload the generated `dist` contents to CloudBase Static Website Hosting as a static site.

然后将生成的 `dist` 内容上传到 CloudBase 静态网站托管。

For static file upload:

静态文件上传配置：

- Framework: Other/static
- Install command: empty
- Build command: empty
- Build output directory: `./`
- Deploy path: `/`

也就是：选择“其他/静态”，安装命令和构建命令都留空，直接部署已经构建好的静态文件。不要让 CloudBase 对 `dist` 再执行 `npm install` 或 `npm run build`。

For local Vercel dev and Vercel production, leave `VITE_API_BASE_URL` unset. The app defaults to `/api`.

本地 Vercel 开发和 Vercel 线上部署都不要设置 `VITE_API_BASE_URL`，应用会默认请求 `/api`。

After static deployment, test:

静态站点部署后测试：

- Open the CloudBase static hosting domain.
- Pick a level and verify the word bank loads.
- Finish a game and verify the encouragement message loads.

中文检查项：

- 打开 CloudBase 静态网站默认域名。
- 选择一个关卡，确认可以生成词库。
- 完成一局游戏，确认结算页能显示 AI 鼓励语。
