import type { Provider } from './types.ts'
import { ProviderError, UPSTREAM_TIMEOUT_MS } from './types.ts'

// UapiPro 翻译接口适配器
const UAPI_ENDPOINT = 'https://uapis.cn/api/v1/translate/text'

const LANGS = [
  { code: 'zh', name: '中文（简体）' },
  { code: 'zh-TW', name: '中文（繁体）' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
]

const uapi: Provider = {
  id: 'uapi',
  name: 'Uapi',
  docsUrl: 'https://uapis.cn',
  docsHint: '前往 uapis.cn 注册免费账户获取 Key',
  credentialFields: [
    { envKey: 'UAPI_API_KEY', label: 'API Key', placeholder: 'Uapi API Key' },
  ],
  maxChars: 3000,
  sourceLanguages: LANGS,
  targetLanguages: LANGS,
  defaultTarget: 'en',

  async translate({ text, toLang, creds }) {
    const url = `${UAPI_ENDPOINT}?to_lang=${encodeURIComponent(toLang)}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.UAPI_API_KEY}`,
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    const data = await resp.json().catch(() => ({})) as Record<string, unknown>

    if (!resp.ok) {
      throw new ProviderError(
        resp.status >= 500 ? 502 : resp.status,
        typeof data?.code === 'string' ? data.code : 'UPSTREAM_ERROR',
        typeof data?.message === 'string' ? data.message : `翻译服务请求失败（HTTP ${resp.status}）`,
      )
    }

    return {
      translate: typeof data?.translate === 'string' ? data.translate : '',
      original: typeof data?.text === 'string' ? data.text : text,
    }
  },
}

export default uapi
