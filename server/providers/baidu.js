import { md5Hex } from './md5.js'

// 百度翻译开放平台 通用文本翻译 API
// 签名：sign = MD5(appid + q + salt + 密钥)，32 位小写，拼接时 q 不做 URL encode
// 端点用经典通用翻译接口（注册即用）；如需切到新版大模型接口，
// 换成 https://fanyi-api.baidu.com/ait/api/aiTextTranslate 并在表单加 model_type=nmt，签名算法一致
const BAIDU_ENDPOINT = 'https://fanyi-api.baidu.com/api/trans/vip/translate'

const LANGS = [
  { code: 'zh', name: '中文（简体）' },
  { code: 'cht', name: '中文（繁体）' },
  { code: 'en', name: '英语' },
  { code: 'jp', name: '日语' },
  { code: 'kor', name: '韩语' },
]

export default {
  id: 'baidu',
  name: '百度翻译',
  docsUrl: 'https://fanyi-api.baidu.com',
  docsHint: '前往 fanyi-api.baidu.com 注册并在开发者信息页获取 APP ID 与密钥',
  credentialFields: [
    { envKey: 'BAIDU_APP_ID', label: 'APP ID', placeholder: '百度翻译 APP ID' },
    { envKey: 'BAIDU_SECRET_KEY', label: '密钥', placeholder: '百度翻译密钥（开发者信息页查看）' },
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
      }),
    })

    const data = await resp.json().catch(() => ({}))

    // 百度出错时 HTTP 状态码可能仍是 200，以 body 内 error_code 为准
    if (data.error_code) {
      throw {
        status: resp.ok ? 502 : resp.status,
        message: `百度翻译错误 ${data.error_code}: ${data.error_msg || ''}`.trim(),
        code: `BAIDU_${data.error_code}`,
      }
    }
    if (!resp.ok) {
      throw {
        status: resp.status,
        message: `百度翻译请求失败（HTTP ${resp.status}）`,
        code: 'UPSTREAM_ERROR',
      }
    }

    // 多行文本时 trans_result 按行拆分返回，逐行拼接还原
    const parts = Array.isArray(data.trans_result)
      ? data.trans_result.map((item) => item.dst)
      : [data.trans_result?.dst]
    return { translate: parts.filter(Boolean).join('\n'), original: text }
  },
}
