import type { Provider } from './types.ts'
import { ProviderError, UPSTREAM_TIMEOUT_MS } from './types.ts'

// DeepL 翻译 API
// Free 版 Auth Key 以 ":fx" 结尾 → api-free.deepl.com；Pro 版 → api.deepl.com
// DeepL 目标语言仅提供简体中文（ZH），无繁体，语言表相应精简
const LANGS = [
  { code: 'zh', name: '中文（简体）' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
]

const deepl: Provider = {
  id: 'deepl',
  name: 'DeepL',
  docsUrl: 'https://www.deepl.com/zh/pro-api',
  docsHint: '前往 deepl.com 注册 DeepL API Free（免费额度），Auth Key 以 :fx 结尾',
  credentialFields: [
    { envKey: 'DEEPL_API_KEY', label: 'Auth Key', placeholder: 'DeepL Auth Key（Free 版以 :fx 结尾）' },
  ],
  maxChars: 50000,
  sourceLanguages: LANGS,
  targetLanguages: LANGS,
  defaultTarget: 'en',

  async translate({ text, fromLang, toLang, creds }) {
    const apiKey = creds.DEEPL_API_KEY
    const host = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'

    const body: Record<string, unknown> = {
      text: [text],
      target_lang: toLang.toUpperCase(),
    }
    // source_lang 省略时 DeepL 自动检测
    if (fromLang && fromLang !== 'auto') {
      body.source_lang = fromLang.toUpperCase()
    }

    const resp = await fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `DeepL-Auth-Key ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    const data = await resp.json().catch(() => ({})) as Record<string, unknown>

    if (!resp.ok) {
      // 456 = 账户配额耗尽（不可重试）
      const quotaHint = resp.status === 456 ? '（DeepL 免费额度已用尽）' : ''
      const message = typeof data?.message === 'string' ? data.message : `DeepL 请求失败（HTTP ${resp.status}）`
      throw new ProviderError(resp.status, `DEEPL_HTTP_${resp.status}`, message + quotaHint)
    }

    const translations = Array.isArray(data?.translations) ? data.translations as Array<Record<string, unknown>> : []
    return {
      translate: typeof translations[0]?.text === 'string' ? translations[0].text : '',
      original: text,
    }
  },
}

export default deepl
