<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { AUTO_LANG } from '@/constants/languages'
import type { Language } from '@/types'
import { Toaster } from '@/components/ui/sonner'
import { useHistory } from '@/composables/useHistory'
import { useProviders } from '@/composables/useProviders'
import { useTranslate } from '@/composables/useTranslate'
import AppHeader from '@/components/AppHeader.vue'
import HistoryList from '@/components/HistoryList.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import TranslatePanes from '@/components/TranslatePanes.vue'
import TranslateToolbar from '@/components/TranslateToolbar.vue'

/* ---------------- 语言与输入状态 ---------------- */
const LANG_FROM_KEY = 'yichen_from_lang'
const LANG_TO_KEY = 'yichen_to_lang'

const inputText = ref('')
// 源语言：'auto' 为自动检测；语言选择持久化，下次打开自动恢复
const fromLang = ref(localStorage.getItem(LANG_FROM_KEY) || 'auto')
const toLang = ref(localStorage.getItem(LANG_TO_KEY) || 'en')
const showSettings = ref(false)

/* ---------------- 领域逻辑（composables） ---------------- */
// 轻提示（引擎切换语言回退等）走 toast
const notify = (msg: string) => toast.info(msg)

const { history, push: pushHistory, clear: clearHistory } = useHistory()
const {
  providers,
  currentProviderId,
  currentProvider,
  storageMode,
  providerNames,
  langNames,
  loadProviders,
  applyProviderFallback,
} = useProviders(notify)
const { resultText, loading, errorMsg, translate, reset: resetResult } = useTranslate({
  inputText,
  fromLang,
  toLang,
  providerId: currentProviderId,
  provider: currentProvider,
  onNotConfigured: () => {
    showSettings.value = true
  },
  onSuccess: pushHistory,
})

/* ---------------- 派生状态 ---------------- */
const fromLangOptions = computed<Language[]>(() => [
  AUTO_LANG,
  ...(currentProvider.value?.sourceLanguages || []),
])
const targetOptions = computed<Language[]>(() => currentProvider.value?.targetLanguages || [])
// 字数上限随引擎变化（Uapi 3000 / 百度 6000 / DeepL 50000）
const charLimit = computed(() => currentProvider.value?.maxChars ?? 3000)
// 源语言选 auto 时，后端不支持把 auto 当目标语言，交换时需处理
const canSwap = computed(() => fromLang.value !== 'auto')
const canTranslate = computed(() => inputText.value.trim().length > 0 && !loading.value)

/* ---------------- 生命周期与联动 ---------------- */
onMounted(loadProviders)

// 语言选择持久化
watch([fromLang, toLang], ([f, t]) => {
  localStorage.setItem(LANG_FROM_KEY, f)
  localStorage.setItem(LANG_TO_KEY, t)
})

// 切换引擎：当前语言不被新引擎支持时自动回退并轻提示
watch(currentProviderId, () => applyProviderFallback(fromLang, toLang))

/* ---------------- 操作 ---------------- */
function swapLangs() {
  if (!canSwap.value) return
  const tmp = fromLang.value
  fromLang.value = toLang.value
  toLang.value = tmp
  // 若已有译文，把译文作为新输入，便于反向翻译
  if (resultText.value) {
    inputText.value = resultText.value
    resetResult()
  }
}

function clearAll() {
  inputText.value = ''
  resetResult()
}

function onSettingsSaved(providerId: string) {
  // 保存即切换到刚配置的引擎
  if (providerId) currentProviderId.value = providerId
  loadProviders()
}
</script>

<template>
  <div class="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8">
    <Toaster position="top-center" close-button rich-colors />

    <AppHeader :provider="currentProvider" @open-settings="showSettings = true" />

    <main class="mt-6 flex flex-1 flex-col gap-4 sm:mt-8 sm:gap-5">
      <TranslateToolbar
        v-model:from-lang="fromLang"
        v-model:to-lang="toLang"
        :from-options="fromLangOptions"
        :to-options="targetOptions"
        :can-swap="canSwap"
        :can-translate="canTranslate"
        :can-clear="!!inputText || !!resultText"
        :loading="loading"
        @swap="swapLangs"
        @translate="translate"
      />

      <TranslatePanes
        v-model:input-text="inputText"
        :result-text="resultText"
        :error-msg="errorMsg"
        :loading="loading"
        :char-limit="charLimit"
        @translate="translate"
      />

      <HistoryList
        :items="history"
        :provider-names="providerNames"
        :lang-names="langNames"
        @clear="clearHistory"
      />
    </main>

    <footer class="mt-8 flex flex-wrap gap-x-2 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
      <span>多引擎翻译 · Uapi / 百度翻译 / DeepL</span>
      <span class="opacity-50">·</span>
      <span>
        {{ storageMode === 'kv-session' ? 'Cloudflare Workers · 凭据按会话隔离，仅存于你的浏览器会话' : '本地部署 · 凭据由后端安全保管' }}
      </span>
    </footer>

    <SettingsDialog
      v-if="showSettings"
      :providers="providers"
      :initial-provider="currentProviderId"
      :storage-mode="storageMode"
      @close="showSettings = false"
      @saved="onSettingsSaved"
    />
  </div>
</template>
