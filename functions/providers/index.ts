import uapi from './uapi.ts'
import baidu from './baidu.ts'
import deepl from './deepl.ts'
import { readSecret } from '../shared/env.ts'
import type { Provider } from './types.ts'

// 翻译引擎注册表：新增厂商只需新建一个 adapter 文件并在此注册
export const PROVIDERS: Record<string, Provider> = { uapi, baidu, deepl }
export const DEFAULT_PROVIDER_ID = 'uapi'

export function getProvider(id: string | undefined): Provider | null {
  if (!id) return null
  return PROVIDERS[id] || null
}

// 从站点 Secret 读取某引擎的凭据（值只在 Function 内使用，不下发前端）
export function readCredentials(provider: Provider): Record<string, string> {
  const creds: Record<string, string> = {}
  for (const field of provider.credentialFields) {
    creds[field.envKey] = readSecret(field.envKey)
  }
  return creds
}

export function isConfigured(provider: Provider, creds: Record<string, string>): boolean {
  return provider.credentialFields.every((field) => Boolean(creds[field.envKey]))
}

// 下发给前端的引擎摘要：能力与配置状态，不含凭据值
export function summarize(provider: Provider) {
  const creds = readCredentials(provider)
  return {
    id: provider.id,
    name: provider.name,
    docsUrl: provider.docsUrl,
    docsHint: provider.docsHint,
    configured: isConfigured(provider, creds),
    maxChars: provider.maxChars,
    sourceLanguages: provider.sourceLanguages,
    targetLanguages: provider.targetLanguages,
    defaultTarget: provider.defaultTarget,
    credentialFields: provider.credentialFields.map(({ envKey, label }) => ({ envKey, label })),
  }
}
