import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  PROVIDERS,
  DEFAULT_PROVIDER_ID,
  getProvider,
  isConfigured,
  summarize,
} from './providers/index.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ENV_FILE = path.join(__dirname, '.env')

const app = express()
const PORT = process.env.PORT || 3000
const WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:5173'

// 动态凭据：每个引擎一份，支持网页端热更新，无需重启
// 形如 { uapi: { UAPI_API_KEY: '...' }, baidu: { BAIDU_APP_ID: '...', BAIDU_SECRET_KEY: '...' } }
const credentials = {}
for (const provider of Object.values(PROVIDERS)) {
  credentials[provider.id] = {}
  for (const field of provider.credentialFields) {
    credentials[provider.id][field.envKey] = process.env[field.envKey] || ''
  }
}

function setCredentials(providerId, creds) {
  credentials[providerId] = creds
}

function clearCredentials(providerId) {
  const provider = getProvider(providerId)
  for (const field of provider.credentialFields) {
    credentials[providerId][field.envKey] = ''
    delete process.env[field.envKey]
  }
}

// .env 行级读写：已存在则整行替换，否则追加；envKey 仅含大写字母与下划线，可直接进正则
function upsertEnvLine(envContent, envKey, value) {
  const line = `${envKey}=${value}`
  if (new RegExp(`^${envKey}=`, 'm').test(envContent)) {
    return envContent.replace(new RegExp(`^${envKey}=.*`, 'm'), line)
  }
  return envContent.trimEnd() + '\n' + line + '\n'
}

function removeEnvLine(envContent, envKey) {
  return envContent.replace(new RegExp(`^${envKey}=.*\\r?\\n?`, 'm'), '')
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

/**
 * 健康检查
 * 返回各翻译引擎的配置状态与能力（语言表/字数上限/凭据字段定义）
 */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    providers: Object.values(PROVIDERS).map((p) => summarize(p, credentials[p.id])),
  })
})

/**
 * 配置某引擎的凭据（仅本地部署用）
 * POST /api/config/:provider
 * body: { credentials: { ENV_KEY: value, ... } }
 * 将凭据写入 server/.env 并热更新到内存，无需重启即可生效
 */
app.post('/api/config/:provider', (req, res) => {
  const provider = getProvider(req.params.provider)
  if (!provider) {
    return res.status(404).json({ error: `未知翻译引擎：${req.params.provider}` })
  }

  const submitted = req.body?.credentials || {}
  const creds = {}
  for (const field of provider.credentialFields) {
    const value = (submitted[field.envKey] || '').trim()
    if (!value) {
      return res.status(400).json({ error: `参数 ${field.envKey}（${field.label}）必填` })
    }
    creds[field.envKey] = value
  }

  try {
    let envContent = ''
    if (fs.existsSync(ENV_FILE)) {
      envContent = fs.readFileSync(ENV_FILE, 'utf-8')
    }
    for (const [envKey, value] of Object.entries(creds)) {
      envContent = upsertEnvLine(envContent, envKey, value)
    }
    fs.writeFileSync(ENV_FILE, envContent, 'utf-8')

    // 热更新内存中的凭据，无需重启即可立即生效
    setCredentials(provider.id, creds)

    return res.json({ ok: true, message: `${provider.name} 凭据已保存并生效` })
  } catch (err) {
    console.error('[config] error:', err)
    return res.status(500).json({ error: '写入 .env 失败：' + err.message })
  }
})

/**
 * 清除某引擎的凭据（仅本地部署用）
 * DELETE /api/config/:provider
 * 从 server/.env 移除该引擎的凭据行，并清空内存
 */
app.delete('/api/config/:provider', (req, res) => {
  const provider = getProvider(req.params.provider)
  if (!provider) {
    return res.status(404).json({ error: `未知翻译引擎：${req.params.provider}` })
  }

  try {
    if (fs.existsSync(ENV_FILE)) {
      let envContent = fs.readFileSync(ENV_FILE, 'utf-8')
      for (const field of provider.credentialFields) {
        envContent = removeEnvLine(envContent, field.envKey)
      }
      fs.writeFileSync(ENV_FILE, envContent, 'utf-8')
    }
    clearCredentials(provider.id)

    return res.json({ ok: true, message: `${provider.name} 凭据已清除` })
  } catch (err) {
    console.error('[config delete] error:', err)
    return res.status(500).json({ error: '清除 .env 失败：' + err.message })
  }
})

/**
 * 翻译代理接口
 * POST /api/translate
 * body: { text: string, to_lang: string, from_lang?: string, provider?: string }
 *
 * 将前端请求按所选引擎转发到对应厂商，凭据仅在后端使用，前端不可见。
 * provider 缺省时使用默认引擎（Uapi）。
 */
app.post('/api/translate', async (req, res) => {
  try {
    const { text, to_lang, from_lang, provider: providerId } = req.body || {}

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '参数 text 必填且为字符串' })
    }
    if (!to_lang || typeof to_lang !== 'string') {
      return res.status(400).json({ error: '参数 to_lang 必填且为字符串' })
    }

    const provider = getProvider(providerId || DEFAULT_PROVIDER_ID)
    if (!provider) {
      return res.status(400).json({ error: `未知翻译引擎：${providerId}` })
    }
    if (text.length > provider.maxChars) {
      return res.status(400).json({ error: `${provider.name} 单次翻译不能超过 ${provider.maxChars} 字符` })
    }

    const creds = credentials[provider.id]
    if (!isConfigured(provider, creds)) {
      return res.status(400).json({ error: `${provider.name} 未配置凭据，请点击右上角「设置」配置` })
    }

    const result = await provider.translate({
      text,
      fromLang: from_lang || 'auto',
      toLang: to_lang,
      creds,
    })
    return res.json({ ...result, provider: provider.id })
  } catch (err) {
    // adapter 抛出的结构化上游错误：透传状态码与厂商错误信息
    if (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600 && err.message) {
      console.error('[translate] upstream error:', err.status, err.code, err.message)
      return res.status(err.status).json({
        error: err.message,
        code: err.code || 'UPSTREAM_ERROR',
      })
    }
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
  for (const p of Object.values(PROVIDERS)) {
    console.log(`  引擎 ${p.name}: ${isConfigured(p, credentials[p.id]) ? '已配置' : '未配置'}`)
  }
})
