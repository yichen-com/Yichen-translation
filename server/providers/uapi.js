// UapiPro 翻译接口适配器
// 使用全局 fetch（Node 18+ 与 Cloudflare Workers 均内置），双端共用
const UAPI_ENDPOINT = 'https://uapis.cn/api/v1/translate/text'

const LANGS = [
  { code: 'zh', name: '中文（简体）' },
  { code: 'zh-TW', name: '中文（繁体）' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
]

export default {
  id: 'uapi',
  name: 'Uapi',
  docsUrl: 'https://uapis.cn',
  docsHint: '前往 uapis.cn 注册免费账户获取 Key',
  credentialFields: [
    { envKey: 'UAPI_API_KEY', label: 'API Key', placeholder: '粘贴你的 Uapi API Key' },
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
    })

    const data = await resp.json().catch(() => ({}))

    if (!resp.ok) {
      throw {
        status: resp.status,
        message: data?.message || `翻译服务请求失败（HTTP ${resp.status}）`,
        code: data?.code || 'UPSTREAM_ERROR',
      }
    }

    // Uapi 成功返回 { translate, text }
    return { translate: data.translate, original: data.text }
  },
}
