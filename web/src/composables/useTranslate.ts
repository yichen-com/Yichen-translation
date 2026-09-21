// 翻译请求流程：校验 → 调 /api/translate → 写结果 → 回调成功（供写历史）
import { ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { HistoryItem, Provider } from '@/types'
import { api } from '@/api'

interface TranslateDeps {
  inputText: Ref<string>
  fromLang: Ref<string>
  toLang: Ref<string>
  providerId: Ref<string>
  provider: ComputedRef<Provider | null>
  /** 当前引擎未配置凭据时回调（打开设置弹窗） */
  onNotConfigured: () => void
  /** 翻译成功回调（写入历史记录） */
  onSuccess: (item: HistoryItem) => void
}

export function useTranslate(deps: TranslateDeps) {
  const resultText = ref('')
  const loading = ref(false)
  const errorMsg = ref('')

  async function translate() {
    if (loading.value) return
    errorMsg.value = ''
    resultText.value = ''

    const text = deps.inputText.value
    const p = deps.provider.value
    const charLimit = p?.maxChars ?? 3000

    if (!text.trim()) {
      errorMsg.value = '请输入要翻译的文本'
      return
    }
    if (text.length > charLimit) {
      errorMsg.value = `${p?.name || '当前引擎'} 单次翻译不能超过 ${charLimit} 字符`
      return
    }
    if (!p) {
      errorMsg.value = '翻译引擎加载中，请稍候重试'
      return
    }
    if (!p.configured) {
      deps.onNotConfigured()
      return
    }

    loading.value = true
    try {
      const resp = await api('/api/translate', {
        method: 'POST',
        body: {
          text,
          to_lang: deps.toLang.value,
          from_lang: deps.fromLang.value,
          provider: deps.providerId.value,
        },
      })
      const data = await resp.json()
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          throw new Error(`凭据无效或无权限，请检查当前引擎的凭据配置（${data?.error || ''}）`)
        }
        throw new Error(data?.error || `翻译失败（HTTP ${resp.status}）`)
      }
      resultText.value = data.translate || ''

      // 写入历史记录（记录所用的引擎）
      if (resultText.value) {
        deps.onSuccess({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          time: Date.now(),
          source: text,
          result: resultText.value,
          fromLang: deps.fromLang.value,
          toLang: deps.toLang.value,
          provider: data.provider || deps.providerId.value,
        })
      }
    }
    catch (err) {
      errorMsg.value = err instanceof Error ? err.message : '翻译请求出错'
    }
    finally {
      loading.value = false
    }
  }

  function reset() {
    resultText.value = ''
    errorMsg.value = ''
  }

  return { resultText, loading, errorMsg, translate, reset }
}
