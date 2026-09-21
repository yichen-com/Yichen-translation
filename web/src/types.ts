// 后端下发的数据模型（与 server/providers/index.js 的 summarize() 输出对齐）

export interface Language {
  code: string
  name: string
}

export interface CredentialField {
  envKey: string
  label: string
  placeholder: string
}

export interface Provider {
  id: string
  name: string
  docsUrl: string
  docsHint: string
  configured: boolean
  maxChars: number
  sourceLanguages: Language[]
  targetLanguages: Language[]
  defaultTarget: string
  credentialFields: CredentialField[]
}

/** 凭据存储模式：kv-session = Cloudflare 版（按会话隔离）；env-file = 本地 Express 版 */
export type StorageMode = 'kv-session' | 'env-file'

/** POST /api/translate 成功响应 */
export interface TranslateResponse {
  translate: string
  original: string
  provider: string
}

/** 历史记录条目（localStorage: gradient_translate_history，格式与旧版兼容） */
export interface HistoryItem {
  id: string
  time: number
  source: string
  result: string
  fromLang: string
  toLang: string
  provider: string
}
