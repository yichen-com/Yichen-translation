# 译尘 · Yichen 翻译工具

个人翻译网站：渐变风界面，支持多家翻译引擎切换，密钥自持（本地部署或 Cloudflare）。

## 功能

- **多引擎切换**：Uapi / 百度翻译 / DeepL，凭据在设置弹窗中配置，即存即用
- **自带密钥（Cloudflare 版）**：每个访问者在网页端上传自己的 API Key，凭据与其浏览器会话绑定、互相隔离
- **文本翻译**：源语言自动检测，支持中/英/日/韩等常用语言互译，各引擎字数上限独立控制
- **语言交换**：源/目标语言一键互换，译文自动回填便于反向翻译
- **回车快捷翻译**：输入框内 Enter 直接翻译，Shift + Enter 换行
- **历史记录**：自动保存最近 50 条翻译（含引擎标识），可复制、展开、清空
- **状态记忆**：翻译引擎与语言选择自动保存，下次打开自动恢复
- **安全保管**：API 密钥只存后端（本地 `.env` / Cloudflare KV），前端不接触，支持网页端热配置

## 快速开始（本地部署）

```bash
npm install
npm run install:all

# 配置密钥：复制 server/.env.example 为 server/.env 并填入（或启动后在网页右上角"设置"里配置）

npm run build   # 构建前端（产物输出到 server/public/）
npm start       # 启动服务，访问 http://localhost:3000
```

开发模式：`npm run dev`（后端 :3000，前端 :5173 热更新）。

## 部署到 Cloudflare（Workers + KV）

一个 Worker 同时托管前端静态资源和翻译 API，用户凭据按浏览器会话存入 KV：

```bash
npm install          # 安装根依赖（含 wrangler）
wrangler login       # 首次使用需在浏览器完成 Cloudflare 授权

npm run deploy       # 构建前端并部署（KV 命名空间首次部署时自动创建）
```

部署完成后 wrangler 会输出 `https://yichen-translation.<你的子域>.workers.dev` 访问地址。
首次部署后可到 Cloudflare 控制台为 Worker 绑定自定义域名。

- **本地调试 Workers 版**：`npm run cf:dev`（访问 http://localhost:8787，KV 使用本地模拟）
- **会话机制**：浏览器首次访问生成随机 UUID 存 localStorage，API 请求经 `X-Session-Id` 头携带；
  凭据以该会话为键存入 KV（静态加密），仅本会话可读写，清除浏览器数据或点「清除配置」即删除
- **零服务器密钥**：部署者无需配置任何翻译密钥，成本只来自 Worker 请求与 KV 读写
  （免费额度：10 万次请求/天、10 万次 KV 读/天，个人使用绰绰有余）

## 技术栈

Vue 3 + Vite ｜ Express（本地）/ Cloudflare Workers（线上）｜ KV 会话存储 ｜ 引擎：Uapi / 百度翻译 / DeepL
