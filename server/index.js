import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ENV_FILE = path.join(__dirname, '.env')

const app = express()
const PORT = process.env.PORT || 3000
const WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:5173'

// 动态 API Key：支持运行时通过 /api/config/key 热更新，无需重启
let _apiKey = process.env.UAPI_API_KEY || ''
function getApiKey() {
  return _apiKey
}
function setApiKey(k) {
  _apiKey = (k || '').trim()
  process.env.UAPI_API_KEY = _apiKey
}

// CORS 白名单：开发模式允许前端 5173，生产模式同源无需 CORS
const allowedOrigins = [WEB_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000']
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(null, false)
  },
}))
app.use(express.json({ limit: '1mb' }))

// 静态资源：生产环境下托管前端构建产物
app.use(express.static('public'))

const UAPI_ENDPOINT = 'https://uapis.cn/api/v1/translate/text'

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    apiKeyConfigured: Boolean(getApiKey()),
  })
})

/**
 * 配置 API Key（仅本地部署用）
 * POST /api/config/key
 * body: { key: string }
 * 将 Key 写入 server/.env 文件，并热更新到内存，无需重启即可生效
 */
app.post('/api/config/key', (req, res) => {
  const { key } = req.body || {}
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: '参数 key 必填' })
  }

  try {
    let envContent = ''
    if (fs.existsSync(ENV_FILE)) {
      envContent = fs.readFileSync(ENV_FILE, 'utf-8')
    }

    // 已存在 UAPI_API_KEY 则替换，否则追加
    const keyLine = `UAPI_API_KEY=${key}`
    if (/^UAPI_API_KEY=/m.test(envContent)) {
      envContent = envContent.replace(/^UAPI_API_KEY=.*/m, keyLine)
    } else {
      envContent = envContent.trimEnd() + '\n' + keyLine + '\n'
    }
    fs.writeFileSync(ENV_FILE, envContent, 'utf-8')

    // 热更新内存中的 Key，无需重启即可立即生效
    setApiKey(key)

    return res.json({ ok: true, message: 'API Key 已保存并生效' })
  } catch (err) {
    console.error('[config/key] error:', err)
    return res.status(500).json({ error: '写入 .env 失败：' + err.message })
  }
})

/**
 * 清除 API Key（仅本地部署用）
 * DELETE /api/config/key
 * 从 server/.env 文件中移除 UAPI_API_KEY 行，并清空内存中的 Key
 */
app.delete('/api/config/key', (req, res) => {
  try {
    if (fs.existsSync(ENV_FILE)) {
      let envContent = fs.readFileSync(ENV_FILE, 'utf-8')
      // 移除 UAPI_API_KEY 行
      envContent = envContent.replace(/^UAPI_API_KEY=.*\r?\n?/m, '')
      fs.writeFileSync(ENV_FILE, envContent, 'utf-8')
    }
    // 清空内存中的 Key
    setApiKey('')

    return res.json({ ok: true, message: 'API Key 已清除' })
  } catch (err) {
    console.error('[config/key delete] error:', err)
    return res.status(500).json({ error: '清除 .env 失败：' + err.message })
  }
})

/**
 * 翻译代理接口
 * POST /api/translate
 * body: { text: string, to_lang: string }
 *
 * 将前端请求转发到 Uapi，API Key 仅在后端使用，前端不可见。
 */
app.post('/api/translate', async (req, res) => {
  try {
    const { text, to_lang } = req.body || {}

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '参数 text 必填且为字符串' })
    }
    if (!to_lang || typeof to_lang !== 'string') {
      return res.status(400).json({ error: '参数 to_lang 必填且为字符串' })
    }
    if (text.length > 3000) {
      return res.status(400).json({ error: '文本长度不能超过 3000 字符' })
    }
    const currentKey = getApiKey()
    if (!currentKey) {
      return res.status(400).json({ error: '服务器未配置 API Key，请点击右上角"配置 API Key"' })
    }

    const url = `${UAPI_ENDPOINT}?to_lang=${encodeURIComponent(to_lang)}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentKey}`,
      },
      body: JSON.stringify({ text }),
    })

    const data = await resp.json().catch(() => ({}))

    if (!resp.ok) {
      console.error('[translate] upstream error:', resp.status, JSON.stringify(data))
      return res.status(resp.status).json({
        error: data?.message || `翻译服务请求失败（HTTP ${resp.status}）`,
        code: data?.code || 'UPSTREAM_ERROR',
      })
    }

    // Uapi 成功返回 { translate, text }
    return res.json({
      translate: data.translate,
      original: data.text,
    })
  } catch (err) {
    console.error('[translate] error:', err)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// 兜底：生产环境 SPA 路由
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' })
})

app.listen(PORT, () => {
  console.log(`✓ 翻译后端已启动: http://localhost:${PORT}`)
  console.log(`  前端来源: ${WEB_ORIGIN}`)
  console.log(`  API Key: ${getApiKey() ? '已配置' : '未配置（请在网页配置或编辑 .env）'}`)
})
