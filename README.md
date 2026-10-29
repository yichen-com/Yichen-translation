# 译尘 · Yichen 翻译工具

个人翻译站点：渐变风界面，支持多家翻译引擎切换，密钥由站点服务端保管、前端不接触。

## 功能

- **多引擎切换**：Uapi / 百度翻译 / DeepL，密钥配置在站点 Secret 中，页面只显示配置状态
- **文本翻译**：源语言自动检测，支持中/英/日/韩等常用语言互译，各引擎字数上限独立控制
- **语言交换**：源/目标语言一键互换，译文自动回填便于反向翻译
- **回车快捷翻译**：输入框内 Enter 直接翻译，Shift + Enter 换行
- **历史记录**：自动保存最近 50 条翻译（含引擎标识），可复制、展开、清空
- **状态记忆**：翻译引擎与语言选择自动保存，下次打开自动恢复
- **安全保管**：API 密钥只存在 Function 运行时的环境变量中，前端与静态产物均不包含密钥

## 目录

| 路径 | 作用 |
| --- | --- |
| `web/` | Vue 3 + Vite 前端源码 |
| `server/public/` | 前端构建产物（站点静态文件目录） |
| `functions/` | 翻译 Edge Function：健康检查、翻译代理与三家引擎适配器 |
| `dev/` | 本地联调用 Node 适配器，不进入发布包 |
| `server/` | 旧的本地 Express 部署方式，站点版本已不再使用 |

## 本地开发

```bash
npm install
npm run install:all

# 本地密钥：复制 server/.env.example 为 server/.env 并填入（仅本地联调需要）
npm run dev    # 前端 :5173，Function 本地适配器 :8000
```

## 构建

```bash
npm run build  # 产物输出到 server/public/
```

## 部署（Qoder Sites）

- 静态文件：`server/public`
- 服务端：`functions/`（一个 `app` Edge Function）
- 站点 Secret：`UAPI_API_KEY`、`BAIDU_APP_ID`、`BAIDU_SECRET_KEY`、`DEEPL_API_KEY`
- 接口：`GET /functions/v1/app/health`、`POST /functions/v1/app/translate`

## 技术栈

Vue 3 + Vite ｜ Qoder Sites Edge Function（Deno）｜ 引擎：Uapi / 百度翻译 / DeepL
