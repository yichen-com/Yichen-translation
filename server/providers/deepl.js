import fetch from 'node-fetch'

// DeepL 翻译 API
// Free 版 Auth Key 以 ":fx" 结尾 → api-free.deepl.com；Pro 版 → api.deepl.com
// DeepL 目标语言仅提供简体中文（ZH），无繁体，语言表相应精简
const LANGS = [
  { code: 'zh', name: '中文（简体）' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
]

export default {
  id: 'deepl',
  name: 'DeepL',
  docsUrl: 'https://www.deepl.com/zh/pro-api',
  docsHint: '前往 deepl.com 注册 DeepL API Free（免费额度），Auth Key 以 :fx 结尾',
  credentialFields: [
    { envKey: 'DEEPL_API_KEY', label: 'Auth Key', placeholder: '粘贴 DeepL Auth Key（Free 版以 :fx 结尾）' },
  ],
  maxChars: 50000,
  sourceLanguages: LANGS,
  targetLanguages: LANGS,
  defaultTarget: 'en',

  async translate({ text, fromLang, toLang, creds }) {
    const apiKey = creds.DEEPL_API_KEY
    const host = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'

    const body = {
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
    })

    const data = await resp.json().catch(() => ({}))

    if (!resp.ok) {
      // 456 = 账户配额耗尽（不可重试）
      const quotaHint = resp.status === 456 ? '（DeepL 免费额度已用尽）' : ''
      throw {
        status: resp.status,
        message: (data?.message || `DeepL 请求失败（HTTP ${resp.status}）`) + quotaHint,
        code: data?.code || `DEEPL_HTTP_${resp.status}`,
      }
    }

    return { translate: data.translations?.[0]?.text ?? '', original: text }
  },
}
