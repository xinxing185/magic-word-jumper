# Magic Word Jumper 项目备忘

## 项目定位

Magic Word Jumper 是一个 Vite + React + TypeScript 的儿童英语单词体感游戏。玩家选择 Raz 难度关卡后，应用会生成或读取一组英文词库，每局从中抽取 10 个单词，朗读目标词，并让孩子通过摄像头体感或点击方式选择正确词卡。

核心体验面向低龄儿童：界面明亮、按钮大、文字负担低，支持 Web Speech API 朗读、音效反馈、答题计分、结算鼓励语和 AI 生成词库。

## 架构概览

- `App.tsx` 是前端主状态容器，管理菜单、关卡选择、语音老师、加载、游戏中和结算状态。
- `components/GameView.tsx` 是游戏核心界面，负责摄像头、MediaPipe Pose、画布背景、头部命中检测、答题交互、语音朗读、音效、计分和退出流程。
- `components/GameBlock.tsx` 和 `components/PixelButton.tsx` 是复用展示组件，负责像素风词卡和按钮。
- `constants.ts` 保存 Raz 关卡、内置题目、关卡元数据，以及从内置题目派生的 fallback 词库。
- `types.ts` 定义 `Level`、`Question`、`WordBankLevel`、`WordEntry`、`GameState`、`GameScore` 等核心数据结构。
- `services/apiClient.ts` 统一拼接 API 地址，默认请求同源 `/api`，也支持通过 `VITE_API_BASE_URL` 指向外部 API。
- `services/wordBankService.ts` 调用 `/api/word-bank`，规范化和校验词库，写入 `localStorage` 缓存，并在 AI 不可用时回退到 starter words。
- `services/encouragementService.ts` 调用 `/api/encouragement` 获取结算鼓励语，失败时使用本地 fallback 文案。
- `utils/questionGenerator.ts` 从词库中选择 10 个单词，尽量避开近期出现过的词，并为每题生成 3 选 1 的选项。

## 核心功能

- 关卡选择：从 `LEVEL_METADATA` 展示多个 Raz 难度/主题关卡。
- AI 词库：每个关卡目标词库大小为 `WORD_BANK_TARGET_SIZE = 80`，生成成功后缓存到浏览器。
- 手动刷新词库：关卡卡片右下角刷新按钮可重新请求 AI 生成词库。
- 游戏回合：每局 10 题，先朗读目标词，再展示 3 张词卡。
- 体感交互：`GameView` 使用 MediaPipe Pose 和摄像头画面，计算头部/脸部位置命中 START 或词卡。
- 点击交互：START、词卡、PLAY、QUIT 都保留普通点击路径，摄像头或 Pose 不可用时仍可玩。
- 语音老师：菜单中枚举英文系统 voices，过滤 novelty voices，优先自然语音，并提供预听。
- 反馈与计分：答错只计一次 wrong，答对后有语音/音效、confetti 和下一题倒计时。
- 结算鼓励：游戏结束后调用 `/api/encouragement` 生成短鼓励语，失败时显示本地文案。

## API 与 AI

Vercel Serverless API 位于 `api/`：

- `api/aiProvider.ts` 封装 DeepSeek/Gemini provider 选择、prompt、请求和模型环境变量。
- `api/word-bank.ts` 处理 `POST /api/word-bank`，输入 `levelId`，返回关卡元数据、词库、来源和生成时间。
- `api/encouragement.ts` 处理 `POST /api/encouragement`，输入 `score` 和 `total`，返回鼓励语。

默认 provider 是 DeepSeek。设置 `AI_PROVIDER=gemini` 可切换到 Gemini。

常用服务端环境变量：

- `AI_PROVIDER=deepseek` 或 `AI_PROVIDER=gemini`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_WORD_BANK_MODEL`
- `GEMINI_ENCOURAGEMENT_MODEL`

不要把任何模型 API Key 放进前端代码或 `VITE_*` 环境变量。

## CloudBase 部署

`cloudbase/functions/api/` 是腾讯云 CloudBase HTTP 云函数版本，用于静态托管前端时提供 `/api/*` 接口。

- `cloudbase/functions/api/index.js` 包含 CloudBase 函数入口、路径解析、CORS、DeepSeek/Gemini 请求、词库生成和鼓励语生成。
- `cloudbase/functions/api/server.js` 是本地/函数运行时 HTTP 包装。
- `cloudbase/functions/api/package.json` 是云函数依赖声明。

Vercel API 和 CloudBase API 当前有重复逻辑。修改 AI prompt、provider、词库校验或接口行为时，需要同步检查两套实现。

CloudBase 静态托管前端时，构建命令需要显式设置 API Base：

```sh
VITE_API_BASE_URL=https://<cloudbase-domain>/api npm run build
```

Vercel 本地和线上默认请求同源 `/api`，通常不要设置 `VITE_API_BASE_URL`。

## 运行命令

- `npm run dev`：用 Vercel Dev 同时启动 Vite 前端和 Serverless API，并在启动前加载 `.env.local`。
- `npm run dev:vite`：只启动 Vite 前端，不提供 `/api/*`。
- `npm run build`：构建前端到 `dist`。
- `npm run preview`：预览构建产物。
- `npm run typecheck`：运行 TypeScript 类型检查。

## Dev Rules

- 密钥安全：不要把 `DEEPSEEK_API_KEY`、`GEMINI_API_KEY` 或任何服务端密钥写入前端代码、`VITE_*` 变量或提交到仓库。
- API 同步：修改 AI prompt、词库校验、provider 逻辑、`/word-bank` 或 `/encouragement` 行为时，要同步检查 `api/` 和 `cloudbase/functions/api/` 两套实现。
- 关卡维护：新增或修改关卡优先改 `constants.ts` 的 `LEVELS`；确认 `LEVEL_METADATA` 和 `FALLBACK_WORD_BANKS` 的派生逻辑仍然正确。
- 词库规则：生成词必须适合儿童、英文小写、无空格、无品牌/成人/惊吓内容，并且保留 `word/icon/category` 结构。
- 交互规则：体感交互和点击交互都要保持可用；改 `GameView` 时要注意摄像头权限、Pose 加载失败、无姿态识别、移动端尺寸和退出流程。
- 语音规则：Web Speech API 可能异步加载 voice；改语音逻辑时保持默认 voice fallback，避免阻塞游戏流程。
- 状态与缓存：`localStorage` 缓存包括词库和近期单词；改缓存 key 或结构时要考虑旧缓存失效和 fallback。
- UI 风格：保持儿童友好、明亮、大按钮、低阅读负担；不要引入复杂设置页或成人化界面。
- 验证习惯：代码改动后优先运行 `npm run typecheck`；涉及构建或部署配置时运行 `npm run build`；涉及体感/UI 时用浏览器实际检查摄像头、点击答题、结算和 API fallback。
- 部署习惯：Vercel 本地/线上默认请求同源 `/api`；CloudBase 静态托管需要构建时设置 `VITE_API_BASE_URL=https://<cloudbase-domain>/api`。

## 后续开发注意点

- `GameView` 里有大量计时器、refs 和浏览器 API。修改答题流程时，要确认 `canAnswer`、`feedback`、`isResolvingRef`、`questionFlowRef` 和清理逻辑仍然一致。
- `window.speechSynthesis.cancel()` 会中断当前朗读。新增语音反馈时要避免和题目朗读互相打断到不可理解。
- AI 词库前端和后端都有规范化/校验逻辑。后端负责挡掉无效生成结果，前端负责兜底和缓存安全。
- 内置 fallback 词库来自 `LEVELS` 的 options。若某个内置关卡选项太少或重复太多，会影响 AI 失败时的可玩性。
- `index.html` 直接加载 Tailwind CDN、Google Fonts 和 MediaPipe CDN。离线或内网环境可能需要替换这些外部资源。
- 这个项目主要服务儿童学习场景。新增内容时优先考虑安全、清晰、低挫败感和可重复游玩。
