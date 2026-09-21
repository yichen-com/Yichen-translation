// 源语言"自动检测"选项（仅用于源语言下拉）
// 各引擎支持的语言表由后端 /api/health 按厂商下发，此处不再硬编码
import type { Language } from '@/types'

export const AUTO_LANG: Language = { code: 'auto', name: '自动检测' }
