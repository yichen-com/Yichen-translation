// Uapi 翻译接口支持的语言
// 源语言支持自动检测（code 为 'auto'），完整列表参考 https://uapis.cn/docs/api-reference/post-translate-text

// 自动检测选项（仅用于源语言）
export const AUTO_LANG = { code: 'auto', name: '自动检测' }

// 目标语言列表（精简为常用语言）
export const LANGUAGES = [
  { code: 'zh', name: '中文（简体）' },
  { code: 'zh-TW', name: '中文（繁体）' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
]
