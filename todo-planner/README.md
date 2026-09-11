# 时间规划（todo-planner）

个人使用的时间规划 / 待办 PWA。输入一句话，AI 拆成可执行的小步骤，预览确认后保存到本地（IndexedDB）。

## 技术栈

- React + TypeScript + Vite
- Tailwind CSS
- vite-plugin-pwa
- Dexie（IndexedDB）
- zod（校验 AI 返回）
- Cloudflare Worker 中转调用 Claude API（代码在 `worker/` 目录）

## 本地开发

```powershell
npm install
npm run dev
```

手机联调（同一 WiFi）：

```powershell
npm run dev -- --host
# 然后用电脑的局域网 IP 在手机浏览器打开
```

## 环境变量

前端通过 `VITE_WORKER_URL` 指定 Worker 地址。复制示例文件为 `.env.local`：

```powershell
copy .env.example .env.local
```

然后编辑 `.env.local`：

```
VITE_WORKER_URL=https://todo-planner-worker.leoliu190071.workers.dev
```

`.env.local` 已被 `.gitignore`（`*.local` 规则）排除，不要提交到 Git。

App 访问 Worker 的密码在 App 的「设置」页里填写并保存（存在本地 IndexedDB），不会出现在代码或打包产物里。

## 常用命令

```powershell
npm run dev      # 开发服务器
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览构建产物
npm test         # 单元测试（vitest）
npm run lint     # oxlint
```

## Worker

Worker 代码在 `worker/`，见 `worker/README.md`。部署前需要在 worker 目录下设置
`APP_PASSWORD` 和 `ANTHROPIC_API_KEY` 两个 secret。
