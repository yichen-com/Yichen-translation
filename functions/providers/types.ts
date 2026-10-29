export type Language = { code: string; name: string }

export type CredentialField = {
  envKey: string
  label: string
  placeholder?: string
}

export type TranslateInput = {
  text: string
  fromLang: string
  toLang: string
  creds: Record<string, string>
}

export type TranslateResult = {
  translate: string
  original: string
}

export type Provider = {
  id: string
  name: string
  docsUrl: string
  docsHint: string
  credentialFields: CredentialField[]
  maxChars: number
  sourceLanguages: Language[]
  targetLanguages: Language[]
  defaultTarget: string
  translate(input: TranslateInput): Promise<TranslateResult>
}

// 上游厂商错误：状态码与可选错误码由 handler 透传，message 为可直接展示的中文
export class ProviderError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ProviderError'
    this.status = status
    this.code = code
  }
}

export const UPSTREAM_TIMEOUT_MS = 15000
