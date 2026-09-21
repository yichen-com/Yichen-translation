// 翻译引擎：加载后端下发的引擎列表、持久化选择、切换引擎时语言自动回退
import { computed, ref } from 'vue'
import type { Provider, StorageMode } from '@/types'
import { api } from '@/api'

const PROVIDER_KEY = 'yichen_provider'

export function useProviders(notify: (msg: string) => void) {
  const providers = ref<Provider[]>([])
  const currentProviderId = ref(localStorage.getItem(PROVIDER_KEY) || 'uapi')
  const storageMode = ref<StorageMode>('env-file')

  const currentProvider = computed(
    () => providers.value.find(p => p.id === currentProviderId.value) || null,
  )

  // 引擎徽标映射（历史记录用）
  const providerNames = computed<Record<string, string>>(() =>
    Object.fromEntries(providers.value.map(p => [p.id, p.name])),
  )

  // 语言代码 → 名称映射（合并所有引擎的语言表，兼容旧记录的任意引擎代码）
  const langNames = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const p of providers.value) {
      for (const l of [...p.sourceLanguages, ...p.targetLanguages]) {
        if (!map[l.code]) map[l.code] = l.name
      }
    }
    return map
  })

  async function loadProviders() {
    try {
      const resp = await api('/api/health')
      const data = await resp.json()
      providers.value = data?.providers || []
      if (data?.storage) storageMode.value = data.storage
      // localStorage 里的引擎已不存在时，优先回退到第一个已配置的引擎
      if (providers.value.length && !providers.value.some(p => p.id === currentProviderId.value)) {
        const firstConfigured = providers.value.find(p => p.configured)
        currentProviderId.value = firstConfigured?.id || providers.value[0].id
      }
    }
    catch {
      providers.value = []
    }
  }

  // 切换引擎后语言回退：当前语言不被新引擎支持时自动回退并轻提示。
  // 由 App.vue 在 watch(currentProviderId) 中调用（语言状态归 App.vue 所有）。
  function applyProviderFallback(fromLang: { value: string }, toLang: { value: string }) {
    const p = currentProvider.value
    if (!p) return
    if (!p.targetLanguages.some(l => l.code === toLang.value)) {
      toLang.value = p.defaultTarget
      notify(`${p.name} 不支持当前目标语言，已切换为「${langNames.value[p.defaultTarget] || p.defaultTarget}」`)
    }
    if (fromLang.value !== 'auto' && !p.sourceLanguages.some(l => l.code === fromLang.value)) {
      fromLang.value = 'auto'
      notify(`${p.name} 不支持当前源语言，已切换为自动检测`)
    }
  }

  return {
    providers,
    currentProviderId,
    currentProvider,
    storageMode,
    providerNames,
    langNames,
    loadProviders,
    applyProviderFallback,
  }
}
