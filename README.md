# 译尘 · Yichen 翻译工具

个人翻译网站，渐变风 UI，基于 Vue 3 + Vite 前端与 Express 后端，支持多翻译引擎切换：**UapiPro**、**百度翻译**、**DeepL**。

## 📌 优化计划

- **增加中英文同步标注**：选中译文段落时，高亮显示原文对应内容（句级对齐）

---

## ✨ 特性

- **多翻译引擎**：UapiPro / 百度翻译 / DeepL 三家自由切换，引擎与凭据统一在「设置」弹窗中管理，适配层架构后续可扩展新厂商
- **渐变风视觉**：紫蓝青冷色系大角度渐变背景 + 径向光晕 + 噪点纹理，玻璃拟态卡片
- **安全凭据管理**：所有凭据存后端 `.env`，前端全程不接触；支持网页端配置与清除，热更新即时生效
- **按引擎动态语言表**：每家引擎声明自己支持的语言，切换引擎时下拉自动更新；当前语言不被支持时自动回退并轻提示（如 DeepL 不支持繁体中文）
- **按引擎字数上限**：Uapi 3000 / 百度 6000 / DeepL 50000 字符，前端计数器随引擎变化
- **文本翻译**：源语言支持自动检测，失败时透传厂商错误详情（如百度 54001 签名错误、DeepL 456 额度耗尽）
- **语言切换**：源/目标语言一键交换，译文自动回填便于反向翻译；语言与引擎选择均持久化，下次打开自动恢复
- **回车快捷翻译**：输入框内按 Enter 直接翻译，Shift + Enter 换行，兼容输入法选词回车
- **历史记录**：翻译结果自动存入历史（localStorage 持久化，最多 50 条），带引擎徽标，支持复制译文、展开全文、清空确认
- **滚动同步**：原文框与译文框双向滚动同步，按比例对应位置
- **自定义下拉**：渐变风语言选择器，淡入滑动动画，智能定位（空间不足时向上展开）
- **本地部署 + 可迁移**：`npm run build` 打包后产物自动输出到 `server/public/`，拷贝整个目录即可在其他设备运行

## 📁 目录结构

```
Yichen-translation/
├── server/                  # Express 后端
│   ├── index.js             # 翻译代理 + 多引擎凭据配置接口
│   ├── providers/           # 翻译引擎适配层
│   │   ├── index.js         # 注册表（新增厂商在此注册）
│   │   ├── uapi.js          # UapiPro 适配器
│   │   ├── baidu.js         # 百度翻译适配器（MD5 签名鉴权）
│   │   └── deepl.js         # DeepL 适配器（Free/Pro 双端点）
│   ├── package.json
│   ├── .env.example         # 环境变量模板
│   └── public/              # 前端构建产物（build 后生成）
├── web/                     # Vue 3 + Vite 前端
│   ├── public/
│   │   ├── favicon.svg      # 浏览器标签图标
│   │   └── logo.svg         # 左上角 Logo
│   ├── src/
│   │   ├── App.vue          # 主界面（多引擎状态管理）
│   │   ├── components/
│   │   │   ├── GradientSelect.vue   # 渐变风自定义下拉
│   │   │   ├── HistoryList.vue      # 历史记录（带引擎徽标）
│   │   │   └── SettingsModal.vue    # 引擎选择 + 凭据配置弹窗
│   │   ├── constants/languages.js   # 自动检测选项
│   │   └── styles/global.css        # 全局渐变风样式
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── package.json             # 根目录统一脚本
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

在根目录执行：

```bash
npm install
npm run install:all
```

### 2. 配置引擎凭据

两种方式任选其一：

**方式 A（推荐）**：复制模板并填写

```bash
copy server\.env.example server\.env
```

编辑 `server/.env`，按需填入（用哪家填哪家，可只填一个）：

```
UAPI_API_KEY=你的UapiKey          # https://uapis.cn 注册
BAIDU_APP_ID=你的APPID            # https://fanyi-api.baidu.com 注册
BAIDU_SECRET_KEY=你的密钥         # 与 APP ID 配套，开发者信息页查看
DEEPL_API_KEY=你的AuthKey         # https://www.deepl.com/zh/pro-api 注册，Free 版以 :fx 结尾
PORT=3000
WEB_ORIGIN=http://localhost:5173
```

**方式 B**：启动后在网页上配置

启动服务后，点击右上角「Uapi · 未配置」按钮打开设置弹窗，选择引擎、粘贴凭据即可（自动写入 `.env` 并热更新即时生效，无需重启）。默认使用 Uapi 引擎，可在弹窗中切换。

### 3. 本地开发

```bash
npm run dev
```

同时启动：
- 后端：http://localhost:3000
- 前端：http://localhost:5173（开发模式，API 请求代理到后端）

### 4. 打包部署

```bash
npm run build
```

构建产物会输出到 `server/public/`。然后启动后端：

```bash
npm start
```

访问 http://localhost:3000 即可使用，前后端由同一个 Express 服务托管。

## 📦 迁移到其他设备

打包后，整个项目目录（不含 `node_modules`）拷贝到目标设备，执行：

```bash
npm install
npm run install:all
npm start
```

即可运行。如需更改端口或凭据，编辑 `server/.env`。

## 🔌 接口说明

### `GET /api/health`

健康检查，返回各引擎配置状态与能力：

```json
{
  "ok": true,
  "providers": [
    {
      "id": "uapi", "name": "Uapi", "configured": true, "maxChars": 3000,
      "sourceLanguages": [...], "targetLanguages": [...], "defaultTarget": "en",
      "credentialFields": [{ "envKey": "UAPI_API_KEY", "label": "API Key", "...": "..." }]
    }
  ]
}
```

### `POST /api/translate`

翻译文本，`provider` 缺省时使用默认引擎 Uapi。

```json
// 请求体
{ "text": "hello world", "to_lang": "zh", "from_lang": "auto", "provider": "baidu" }

// 响应
{ "translate": "你好，世界", "original": "hello world", "provider": "baidu" }
```

### `POST /api/config/:provider`

写入某引擎凭据到 `server/.env` 并热更新到内存（仅本地用）。百度需要两个字段：

```json
{ "credentials": { "BAIDU_APP_ID": "xxx", "BAIDU_SECRET_KEY": "yyy" } }
```

### `DELETE /api/config/:provider`

从 `server/.env` 移除该引擎凭据并清空内存（仅本地用）。

## 🎨 设计说明

- 主色：紫 `#7C3AED` / 蓝 `#2563EB` / 青 `#06B6D4`
- 背景：135° 线性渐变 + 4 处径向光晕
- 噪点：SVG fractalNoise，3.5% 不透明度
- 卡片：玻璃拟态（backdrop-filter blur 20px）
- 交互过渡：240ms cubic-bezier
- Logo：SVG 图片，圆角 + 渐变阴影
- 自定义滚动条：渐变紫青色，8px 宽

## 📝 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + Vite 5 |
| 后端 | Express 4 + node-fetch 3 |
| 引擎 | UapiPro（Bearer）/ 百度翻译（MD5 签名）/ DeepL（Auth Key） |
| 部署 | Node 静态托管，零额外依赖 |
