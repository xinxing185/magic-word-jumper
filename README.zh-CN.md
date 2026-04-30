<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Magic Word Jumper

[English](./README.md)

Magic Word Jumper 是一个 Vite + React 应用，包含用于 AI 调用的 Vercel Serverless API。当前默认使用 DeepSeek，也保留 Gemini 方案，可通过 `AI_PROVIDER=gemini` 切换。所有模型 API Key 都必须只放在服务端环境变量中，不要暴露到浏览器前端。

在 AI Studio 中查看应用：https://ai.studio/apps/drive/1sTlBv0HsFtnS1dF-nolQTzeykmk5BJRh

## 本地运行

**前置条件：** Node.js

1. 安装依赖：

   ```sh
   npm install
   ```

2. 在 `.env.local` 中配置 AI 服务环境变量。

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

3. 使用 Vercel 本地开发服务器运行：

   ```sh
   npm run dev
   ```

`npm run dev` 会同时启动 Vite 前端和 Vercel Serverless API，因此 `/api/word-bank` 和 `/api/encouragement` 会在同一个本地域名下可用。
启动前会加载 `.env.local`，所以服务端 API 可以读取 DeepSeek/Gemini 的环境变量。

如果只改前端 UI，可以运行：

```sh
npm run dev:vite
```

这个命令只启动 Vite，不提供 `/api/*` 服务。

## 部署到 Vercel

1. 将项目推送到 GitHub。
2. 在 Vercel 中从仓库创建项目。
3. 使用 Vite 默认配置：
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 在 Vercel 项目环境变量中添加 AI 服务变量。
5. 部署。

本地 Vercel 开发和 Vercel 线上部署都不要设置 `VITE_API_BASE_URL`，应用会默认请求同域名下的 `/api`。

## 部署到腾讯云 CloudBase

CloudBase 部署分成两部分：静态网站托管部署前端，HTTP 云函数提供 `/api/*` 接口。没有备案域名时，可以先使用 CloudBase 默认域名。

### HTTP 云函数

将 `cloudbase/functions/api` 部署为 CloudBase HTTP 云函数或 Web 函数。上传压缩包根目录必须包含：

- `index.js`
- `server.js`
- `package.json`
- `scf_bootstrap`

推荐函数配置：

- Runtime: Node.js 18 或 Node.js 20
- Timeout: 60 seconds
- Memory: 512 MB

环境变量：

- `AI_PROVIDER=deepseek`
- `DEEPSEEK_API_KEY=...`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-chat`

可选 Gemini 备用环境变量：

- `GEMINI_API_KEY=...`
- `GEMINI_WORD_BANK_MODEL=gemini-2.5-flash-lite`
- `GEMINI_ENCOURAGEMENT_MODEL=gemini-3-flash-preview`

配置 CloudBase HTTP 访问路由：

- Route path: `/api`
- Resource: the uploaded cloud function
- Path passthrough: enabled
- Auth: disabled

如果 CloudBase 网关已经自动注入请求来源，不要在函数代码里再设置 `Access-Control-Allow-Origin`，否则浏览器会因为出现多个 origin 值而拦截 CORS 请求。

函数部署后测试：

- `POST <cloud-function-domain>/api/health`
- `POST <cloud-function-domain>/api/encouragement`
- `POST <cloud-function-domain>/api/word-bank`

### 静态网站托管

构建前端时，将 CloudBase HTTP 路由作为 API Base：

```sh
VITE_API_BASE_URL=https://<your-cloudbase-app-domain>/api npm run build
```

然后将生成的 `dist` 内容上传到 CloudBase 静态网站托管。

静态文件上传配置：

- Framework: Other/static
- Install command: empty
- Build command: empty
- Build output directory: `./`
- Deploy path: `/`

也就是：选择“其他/静态”，安装命令和构建命令都留空，直接部署已经构建好的静态文件。不要让 CloudBase 对 `dist` 再执行 `npm install` 或 `npm run build`。

本地 Vercel 开发和 Vercel 线上部署都不要设置 `VITE_API_BASE_URL`，应用会默认请求 `/api`。

静态站点部署后测试：

- 打开 CloudBase 静态网站默认域名。
- 选择一个关卡，确认可以生成词库。
- 完成一局游戏，确认结算页能显示 AI 鼓励语。

## 部署 Cloudflare Pages 静态站 + CloudBase API

也可以只把静态前端托管到 Cloudflare Pages，`/api/*` 仍然使用腾讯云 CloudBase。

Cloudflare Pages 配置：

- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_BASE_URL=https://<your-cloudbase-app-domain>/api`

`DEEPSEEK_API_KEY`、`GEMINI_API_KEY` 等 AI 密钥只放在 CloudBase 云函数环境变量中，不要添加到 Cloudflare Pages。

如果 Cloudflare 页面调用 API 时出现浏览器 CORS 错误，优先在 CloudBase 控制台配置跨域；也可以在 CloudBase 云函数环境变量中设置：

```sh
CORS_ALLOWED_ORIGINS=https://<your-cloudflare-project>.pages.dev,https://<your-custom-domain>
```

完整清单见 [docs/cloudflare-pages-cloudbase.md](./docs/cloudflare-pages-cloudbase.md)。
