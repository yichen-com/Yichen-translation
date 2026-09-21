import uapi from './uapi.js'
import baidu from './baidu.js'
import deepl from './deepl.js'

// 翻译引擎注册表：新增厂商只需新建一个 adapter 文件并在此注册
export const PROVIDERS = { uapi, baidu, deepl }
export const DEFAULT_PROVIDER_ID = 'uapi'

export function getProvider(id) {
  return PROVIDERS[id] || null
}

// 某引擎的凭据是否已配置齐全
export function isConfigured(provider, credentials) {
  return provider.credentialFields.every((f) => Boolean(credentials?.[f.envKey]))
}

// 下发给前端的引擎摘要（语言表、字数上限、凭据字段定义；不含凭据值）
export function summarize(provider, credentials) {
  return {
    id: provider.id,
    name: provider.name,
    docsUrl: provider.docsUrl,
    docsHint: provider.docsHint,
    configured: isConfigured(provider, credentials),
    maxChars: provider.maxChars,
    sourceLanguages: provider.sourceLanguages,
    targetLanguages: provider.targetLanguages,
    defaultTarget: provider.defaultTarget,
    credentialFields: provider.credentialFields,
  }
}
