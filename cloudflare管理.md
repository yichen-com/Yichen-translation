我先确认一下当前分支状态和线上部署情况，然后给你一份管理/更新的操作说明。

部署已确认在线上（版本 da154239，2026-09-21 部署成功）。注意到 `wrangler.jsonc` 有一处未提交的改动，我看一下是什么。

改动正是部署时 wrangler 自动写回的 KV namespace id（`c321beb2...`）——这个必须提交，否则以后在干净环境重新部署会新建一个空的 KV，导致已有用户配置丢失。我把它提交到当前分支：

部署已确认成功：Worker `yichen-translation` 在线（版本 da154239，今天 14:28 部署，账号 yi_chen007@163.com），KV 凭据存储已自动创建，id 也已写回并提交。下面是管理和更新的完整说明。

## 日常管理（都在 Cloudflare 控制台）

打开 [dash.cloudflare.com](https://dash.cloudflare.com)，左侧 **Workers & Pages** → **yichen-translation**：

- **部署记录**：Deployments 页每次部署一条记录，出问题选旧版本点 **Rollback** 即可一键回滚。
- **监控**：可以看请求数、错误率、CPU 用量。免费版额度是每天 10 万次请求，个人使用完全够。
- **实时日志**：排查问题时在终端跑 `npx wrangler tail`，所有请求日志实时打印（配置凭据、翻译调用的错误都能看到）。
- **自定义域名**（可选）：默认地址是 `https://yichen-translation.<你的子域>.workers.dev`。想用自己的域名，在 Worker 的 **Settings → Domains & Routes → Add Custom Domain** 添加，HTTPS 证书自动配。
- **KV 数据**：左侧 **Storage & Databases → KV** 能看到 `CREDS_KV`，里面 `creds:*` 键是各用户会话保存的 API key。平时不用管它；有用户反馈“配置丢了”，多半就是换浏览器或清了 localStorage 导致会话 ID 变了。

常用 CLI（在项目目录下跑）：

| 命令 | 用途 |
|---|---|
| `npx wrangler tail` | 实时查看线上日志 |
| `npx wrangler deployments list` | 查看部署历史 |
| `npx wrangler rollback` | 回滚到上一版本 |

## 以后怎么更新

**记住一条命令就够了：`npm run deploy`**。它会自动先 vite 构建前端，再把 Worker 代码和静态资源一起上传。不管是改了前端页面、翻译引擎还是 Worker 逻辑，都执行这一条。

建议的更新流程：

1. 改代码后先本地验证：`npm run cf:dev`，会用本地 Workers 环境起完整服务，浏览器打开提示的地址确认没问题。
2. `npm run deploy` 上线，十几秒生效。
3. 如果上线后有问题：dashboard 里 Rollback，或 `npx wrangler rollback`。

两个注意事项：

- **wrangler.jsonc 里的 KV id 不要删**——刚提交的那个 id 就是凭据存储的位置，删了再部署会创建新的空 KV，用户配置会“消失”。
- 网络波动时 deploy 偶发 `fetch failed`，直接重跑一般就好；持续失败的话在 PowerShell 里先设代理再部署：`$env:HTTPS_PROXY="http://127.0.0.1:<你的代理端口>"`。

最后一个建议：目前代码都在 `feat/cloudflare-deploy` 分支上，线上跑的就是这份。你现在用下来确认没问题后，把它合回 master（`git checkout master && git merge feat/cloudflare-deploy`），让 master 成为可部署的主线——需要我现在帮你合并的话说一声。