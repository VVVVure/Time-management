# todo-planner Worker

Cloudflare Worker，作为前端调用 Claude API 的安全中转层。API key 只保存在
Cloudflare secret 中，永远不会进入前端代码或打包产物。

## 接口

### `POST /decompose`

请求头需要 `X-App-Password`，值为 secret `APP_PASSWORD`。

```json
{
  "input": "下周五要交UX的调研报告 还没开始",
  "today": "2026-09-11",
  "weekday": "星期五",
  "maxMinutesPerStep": 25,
  "clarification": null
}
```

响应：`{ "tasks": [...], "question": null }`；信息太模糊时返回
`{ "tasks": [], "question": "..." }`。

### `POST /refine`

```json
{
  "taskTitle": "完成 UX 课调研报告",
  "stepTitle": "写调研发现部分初稿",
  "maxMinutesPerStep": 15
}
```

响应：`{ "steps": [{ "title": "...", "estimatedMinutes": 15 }] }`。

## 本地开发

```powershell
cd worker
npm install

# 复制密钥示例文件，填上本地测试用的密钥（.dev.vars 已被 .gitignore 排除）
copy .dev.vars.example .dev.vars

npm run dev   # 默认 http://127.0.0.1:8787
```

本地测试（PowerShell）：

```powershell
curl.exe -i -X POST http://127.0.0.1:8787/decompose `
  -H "Content-Type: application/json" `
  -H "X-App-Password: 你的本地密码" `
  -d '{\"input\":\"明天交报告\",\"today\":\"2026-09-11\",\"weekday\":\"星期五\",\"maxMinutesPerStep\":25,\"clarification\":null}'
```

## 部署前需要设置的 secret / 变量

- secret `ANTHROPIC_API_KEY`：`npx wrangler secret put ANTHROPIC_API_KEY`
- secret `APP_PASSWORD`：`npx wrangler secret put APP_PASSWORD`
- 变量 `MODEL`：在 `wrangler.jsonc` 的 `vars` 里改（拆解建议用速度快的
  Haiku 系列，具体模型名以 https://docs.claude.com/en/api/overview 为准）
- 变量 `ALLOWED_ORIGIN`：部署前端后改成 Pages 域名；本地开发会自动放行
  localhost

## 安全约束

- 密码不对一律返回 401
- 输入超过 2000 字直接拒绝
- 上游 API 的原始报错不会透传给前端，只返回中文错误码
- CORS 只允许 `ALLOWED_ORIGIN` 和 localhost
