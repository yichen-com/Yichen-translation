# 译尘 · Yichen 翻译工具

个人翻译网站，渐变风 UI，基于 Vue 3 + Vite 前端与 Express 后端，调用 [UapiPro 翻译接口](https://uapis.cn/docs/api-reference/post-translate-text)。

## 📌 优化计划

- **增加中英文同步标注**：选中译文段落时，高亮显示原文对应内容（句级对齐）
- **增加 API 种类**：接入更多翻译服务（如 DeepL、百度翻译、Google Translate），支持多接口切换

---

## ✨ 特性

- **渐变风视觉**：紫蓝青冷色系大角度渐变背景 + 径向光晕 + 噪点纹理，玻璃拟态卡片
- **安全 Key 管理**：API Key 存后端 `.env`，前端全程不接触；支持网页端配置与清除，热更新即时生效
- **文本翻译**：源语言支持自动检测 + 5 种语言可选，目标语言 5 种，支持 3000 字符
- **语言切换**：源/目标语言一键交换，译文自动回填便于反向翻译
- **历史记录**：翻译结果自动存入历史（localStorage 持久化，最多 50 条），支持复制译文、展开全文、清空确认
- **滚动同步**：原文框与译文框双向滚动同步，按比例对应位置
- **自定义下拉**：渐变风语言选择器，淡入滑动动画，智能定位（空间不足时向上展开）
- **本地部署 + 可迁移**：`npm run build` 打包后产物自动输出到 `server/public/`，拷贝整个目录即可在其他设备运行

## 📁 目录结构

```
02-translate/
├── server/                # Express 后端
│   ├── index.js           # 翻译代理 + API Key 配置/清除接口
│   ├── package.json
│   ├── .env.example       # 环境变量模板
│   └── public/            # 前端构建产物（build 后生成）
├── web/                   # Vue 3 + Vite 前端
│   ├── public/
│   │   ├── favicon.svg    # 浏览器标签图标
│   │   └── logo.svg       # 左上角 Logo
│   ├── src/
│   │   ├── App.vue        # 主界面
│   │   ├── components/
│   │   │   ├── GradientSelect.vue   # 渐变风自定义下拉
│   │   │   ├── HistoryList.vue      # 历史记录
│   │   │   └── ApiKeyModal.vue      # API Key 配置弹窗
│   │   ├── constants/languages.js   # 语言列表
│   │   └── styles/global.css        # 全局渐变风样式
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── package.json           # 根目录统一脚本
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

在根目录执行：

```bash
npm install
npm run install:all
```

### 2. 配置 API Key

两种方式任选其一：

**方式 A（推荐）**：复制模板并填写

```bash
copy server\.env.example server\.env
```

编辑 `server/.env`，填入你的 Key：

```
UAPI_API_KEY=你的真实Key
PORT=3000
WEB_ORIGIN=http://localhost:5173
```

**方式 B**：启动后在网页上配置

启动服务后，点击右上角"配置 API Key"按钮，粘贴 Key 即可（自动写入 `.env` 并热更新即时生效，无需重启）。

> Key 获取：前往 [uapis.cn](https://uapis.cn) 注册免费账户。

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

即可运行。如需更改端口或 Key，编辑 `server/.env`。

## 🔌 接口说明

### `POST /api/translate`

翻译文本。

```json
// 请求体
{ "text": "hello world", "to_lang": "zh" }

// 响应
{ "translate": "你好，世界", "original": "hello world" }
```

### `POST /api/config/key`

写入 API Key 到 `server/.env` 并热更新到内存（仅本地用）。

```json
{ "key": "你的Key" }
```

### `DELETE /api/config/key`

从 `server/.env` 移除 API Key 并清空内存（仅本地用）。

### `GET /api/health`

检查后端状态与 Key 是否已配置。

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
| 接口 | UapiPro `/api/v1/translate/text` |
| 部署 | Node 静态托管，零额外依赖 |
