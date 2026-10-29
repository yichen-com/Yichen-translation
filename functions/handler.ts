import { DEFAULT_PROVIDER_ID, getProvider, isConfigured, readCredentials, summarize, PROVIDERS } from './providers/index.ts'
import { ProviderError } from './providers/types.ts'

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function fail(status: number, code: string, message: string): Response {
  return json({ ok: false, error: { code, message } }, status)
}

// 网关会保留子路径：/functions/v1/app/<action>，按最后一段取动作名
function actionOf(url: string): string {
  const segments = new URL(url).pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get('content-length') || 0)
  if (length > 200_000) return null
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? body as Record<string, unknown> : null
  } catch {
    return null
  }
}

export async function handler(request: Request): Promise<Response> {
  const action = actionOf(request.url)

  if (action === 'health') {
    if (request.method !== 'GET') return fail(405, 'method_not_allowed', '只支持 GET')
    return json({
      ok: true,
      providers: Object.values(PROVIDERS).map((provider) => summarize(provider)),
    })
  }

  if (action === 'translate') {
    if (request.method !== 'POST') return fail(405, 'method_not_allowed', '只支持 POST')

    const body = await readJson(request)
    if (!body) return fail(400, 'invalid_body', '请求体必须是合法的 JSON 对象')

    const text = body.text
    const toLang = body.to_lang
    const fromLang = body.from_lang
    if (typeof text !== 'string' || !text.trim()) {
      return fail(400, 'invalid_text', '请输入要翻译的文本')
    }
    if (typeof toLang !== 'string' || !toLang) {
      return fail(400, 'invalid_target', '参数 to_lang 必填且为字符串')
    }
    if (fromLang !== undefined && typeof fromLang !== 'string') {
      return fail(400, 'invalid_source', '参数 from_lang 必须是字符串')
    }

    const provider = getProvider(typeof body.provider === 'string' ? body.provider : DEFAULT_PROVIDER_ID)
    if (!provider) return fail(400, 'unknown_provider', `未知翻译引擎：${String(body.provider)}`)

    if (!provider.targetLanguages.some((lang) => lang.code === toLang)) {
      return fail(400, 'unsupported_target', `${provider.name} 不支持目标语言 ${toLang}`)
    }
    const source = fromLang || 'auto'
    if (source !== 'auto' && !provider.sourceLanguages.some((lang) => lang.code === source)) {
      return fail(400, 'unsupported_source', `${provider.name} 不支持源语言 ${source}`)
    }
    if (text.length > provider.maxChars) {
      return fail(400, 'text_too_long', `${provider.name} 单次翻译不能超过 ${provider.maxChars} 字符`)
    }

    const creds = readCredentials(provider)
    if (!isConfigured(provider, creds)) {
      return fail(400, 'not_configured', `${provider.name} 未配置密钥，请在站点设置中补充后重新打开页面`)
    }

    try {
      const result = await provider.translate({ text, fromLang: source, toLang, creds })
      return json({ ok: true, translate: result.translate, original: result.original, provider: provider.id })
    } catch (error) {
      if (error instanceof ProviderError) {
        // 上游 401/403 属于密钥问题，不能透传：站点网关用这两个状态码表示访问受限
        const status = error.status === 401 || error.status === 403 ? 502 : error.status
        return fail(status, error.code, error.message)
      }
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      if (timedOut) return fail(504, 'upstream_timeout', `${provider.name} 响应超时，请稍后重试`)
      console.error('[translate] unexpected error:', error instanceof Error ? error.name : typeof error)
      return fail(502, 'upstream_error', `${provider.name} 请求失败，请稍后重试`)
    }
  }

  return fail(404, 'not_found', '接口不存在')
}
