// 译尘 · Cloudflare Workers 版后端
// 复用 server/providers 下的引擎适配器（全局 fetch + 纯 JS MD5，双端共用），
// 凭据不再写 .env，而是按浏览器会话存入 KV，实现「每个用户自带 API Key」。
//
// 会话机制：前端首次访问生成随机会话 ID 存 localStorage，之后每个 API 请求
// 通过 X-Session-Id 头携带；凭据以 creds:{sessionId} 为键存 KV（Cloudflare
// 静态加密），仅该会话可读写使用。会话 ID 是 128 位随机 UUID，不可猜测。
import {
  PROVIDERS,
  DEFAULT_PROVIDER_ID,
  getProvider,
  isConfigured,
  summarize,
} from '../server/providers/index.js'

// 仅允许UUID 风格的会话 ID 进 KV 键，防花式键名
const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

const CREDS_PREFIX = 'creds:'

async function readSessionCreds(env, sessionId) {
  if (!SESSION_RE.test(sessionId)) return {}
  try {
    const raw = await env.CREDS_KV.get(CREDS_PREFIX + sessionId)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

async function writeSessionCreds(env, sessionId, creds) {
  const key = CREDS_PREFIX + sessionId
  if (Object.keys(creds).length === 0) {
    await env.CREDS_KV.delete(key)
  } else {
    await env.CREDS_KV.put(key, JSON.stringify(creds))
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    // 非 API 路径交给静态资源（not_found_handling 已配置 SPA 回退）
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    try {
      return await handleApi(request, env, url)
    } catch (err) {
      console.error('[api] unhandled error:', err)
      return json({ error: '服务器内部错误' }, 500)
    }
  },
}

async function handleApi(request, env, url) {
  const { pathname } = url
  const method = request.method
  const sessionId = request.headers.get('X-Session-Id') || ''

  // 健康检查：返回各引擎能力与「当前会话」的配置状态
  if (pathname === '/api/health' && method === 'GET') {
    const creds = await readSessionCreds(env, sessionId)
    return json({
      ok: true,
      // 存储模式标记：前端据此显示正确的凭据说明文案（Express 版为 env-file）
      storage: 'kv-session',
      providers: Object.values(PROVIDERS).map((p) => summarize(p, creds[p.id])),
    })
  }

  // 配置凭据：POST /api/config/:provider  body: { credentials: { ENV_KEY: value } }
  const configMatch = pathname.match(/^\/api\/config\/([a-z]+)$/)
  if (configMatch) {
    if (!SESSION_RE.test(sessionId)) {
      return json({ error: '缺少会话标识，请刷新页面重试' }, 400)
    }
    const provider = getProvider(configMatch[1])
    if (!provider) {
      return json({ error: `未知翻译引擎：${configMatch[1]}` }, 404)
    }

    if (method === 'POST') {
      let body
      try {
        body = await request.json()
      } catch {
        body = {}
      }
      const submitted = body?.credentials || {}
      const fields = {}
      for (const field of provider.credentialFields) {
        const value = (submitted[field.envKey] || '').trim()
        if (!value) {
          return json({ error: `参数 ${field.envKey}（${field.label}）必填` }, 400)
        }
        fields[field.envKey] = value
      }

      const all = await readSessionCreds(env, sessionId)
      all[provider.id] = fields
      await writeSessionCreds(env, sessionId, all)
      return json({ ok: true, message: `${provider.name} 凭据已保存并生效` })
    }

    if (method === 'DELETE') {
      const all = await readSessionCreds(env, sessionId)
      delete all[provider.id]
      await writeSessionCreds(env, sessionId, all)
      return json({ ok: true, message: `${provider.name} 凭据已清除` })
    }
  }

  // 翻译代理：POST /api/translate
  // body: { text, to_lang, from_lang?, provider? }
  if (pathname === '/api/translate' && method === 'POST') {
    let body
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const { text, to_lang, from_lang, provider: providerId } = body || {}

    if (!text || typeof text !== 'string') {
      return json({ error: '参数 text 必填且为字符串' }, 400)
    }
    if (!to_lang || typeof to_lang !== 'string') {
      return json({ error: '参数 to_lang 必填且为字符串' }, 400)
    }

    const provider = getProvider(providerId || DEFAULT_PROVIDER_ID)
    if (!provider) {
      return json({ error: `未知翻译引擎：${providerId}` }, 400)
    }
    if (text.length > provider.maxChars) {
      return json({ error: `${provider.name} 单次翻译不能超过 ${provider.maxChars} 字符` }, 400)
    }

    const sessionCreds = await readSessionCreds(env, sessionId)
    const creds = sessionCreds[provider.id] || {}
    if (!isConfigured(provider, creds)) {
      return json({ error: `${provider.name} 未配置凭据，请点击右上角「设置」配置` }, 400)
    }

    try {
      const result = await provider.translate({
        text,
        fromLang: from_lang || 'auto',
        toLang: to_lang,
        creds,
      })
      return json({ ...result, provider: provider.id })
    } catch (err) {
      // adapter 抛出的结构化上游错误：透传状态码与厂商错误信息
      if (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600 && err.message) {
        console.error('[translate] upstream error:', err.status, err.code, err.message)
        return json({ error: err.message, code: err.code || 'UPSTREAM_ERROR' }, err.status)
      }
      console.error('[translate] error:', err)
      return json({ error: '服务器内部错误' }, 500)
    }
  }

  return json({ error: 'Not Found' }, 404)
}
