import { md5Hex } from '../shared/md5.ts'
import type { Provider } from './types.ts'
import { ProviderError, UPSTREAM_TIMEOUT_MS } from './types.ts'

// 百度翻译开放平台 通用文本翻译 API
// 签名：sign = MD5(appid + q + salt + 密钥)，32 位小写，拼接时 q 不做 URL encode
const BAIDU_ENDPOINT = 'https://fanyi-api.baidu.com/api/trans/vip/translate'

const LANGS = [
  { code: 'zh', name: '中文（简体）' },
  { code: 'cht', name: '中文（繁体）' },
  { code: 'en', name: '英语' },
  { code: 'jp', name: '日语' },
  { code: 'kor', name: '韩语' },
]

const baidu: Provider = {
  id: 'baidu',
  name: '百度翻译',
  docsUrl: 'https://fanyi-api.baidu.com',
  docsHint: '前往 fanyi-api.baidu.com 注册并在开发者信息页获取 APP ID 与密钥',
  credentialFields: [
    { envKey: 'BAIDU_APP_ID', label: 'APP ID', placeholder: '百度翻译 APP ID' },
    { envKey: 'BAIDU_SECRET_KEY', label: '密钥', placeholder: '百度翻译密钥' },
  ],
  maxChars: 6000,
  sourceLanguages: LANGS,
  targetLanguages: LANGS,
  defaultTarget: 'en',

  async translate({ text, fromLang, toLang, creds }) {
    const appid = creds.BAIDU_APP_ID
    const secret = creds.BAIDU_SECRET_KEY
    const salt = String(Date.now())
    const sign = md5Hex(appid + text + salt + secret)

    const resp = await fetch(BAIDU_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        q: text,
        from: fromLang || 'auto',
        to: toLang,
        appid,
        salt,
        sign,
      }).toString(),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    const data = await resp.json().catch(() => ({})) as Record<string, unknown>

    // 百度出错时 HTTP 状态码可能仍是 200，以 body 内 error_code 为准
    if (data?.error_code) {
      throw new ProviderError(
        502,
        `BAIDU_${data.error_code}`,
        `百度翻译错误 ${data.error_code}: ${typeof data.error_msg === 'string' ? data.error_msg : ''}`.trim(),
      )
    }
    if (!resp.ok) {
      throw new ProviderError(502, 'UPSTREAM_ERROR', `百度翻译请求失败（HTTP ${resp.status}）`)
    }

    // 多行文本时 trans_result 按行拆分返回，逐行拼接还原
    const rows = Array.isArray(data?.trans_result) ? data.trans_result as Array<Record<string, unknown>> : []
    const translated = rows.map((item) => (typeof item?.dst === 'string' ? item.dst : '')).filter(Boolean).join('\n')
    return { translate: translated, original: text }
  },
}

export default baidu
