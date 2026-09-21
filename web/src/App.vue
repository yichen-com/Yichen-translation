<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { LANGUAGES, AUTO_LANG } from './constants/languages.js'
import ApiKeyModal from './components/ApiKeyModal.vue'
import HistoryList from './components/HistoryList.vue'
import GradientSelect from './components/GradientSelect.vue'

/* ---------------- 状态 ---------------- */
const inputText = ref('')
const resultText = ref('')
// 源语言：'auto' 为自动检测；目标语言默认英语
const fromLang = ref('auto')
const toLang = ref('en')
const loading = ref(false)
const errorMsg = ref('')

// 后端 API Key 配置状态
const apiKeyReady = ref(false)
const showKeyModal = ref(false)

// 原文/译文滚动容器引用 + 同步锁（避免双向触发死循环）
const inputScrollRef = ref(null)
const resultScrollRef = ref(null)
const syncingScroll = ref(false)

function onInputScroll() {
  if (syncingScroll.value) return
  syncingScroll.value = true
  const src = inputScrollRef.value
  const dst = resultScrollRef.value
  if (src && dst) {
    const ratio = src.scrollTop / (src.scrollHeight - src.clientHeight || 1)
    dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight)
  }
  nextTick(() => { syncingScroll.value = false })
}

function onResultScroll() {
  if (syncingScroll.value) return
  syncingScroll.value = true
  const src = resultScrollRef.value
  const dst = inputScrollRef.value
  if (src && dst) {
    const ratio = src.scrollTop / (src.scrollHeight - src.clientHeight || 1)
    dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight)
  }
  nextTick(() => { syncingScroll.value = false })
}

// 源语言下拉选项：自动检测 + 全部语言
const fromLangOptions = [AUTO_LANG, ...LANGUAGES]

// 历史记录（localStorage 持久化）
const HISTORY_KEY = 'gradient_translate_history'
const MAX_HISTORY = 50
const history = ref([])

/* ---------------- 计算 ---------------- */
const charCount = computed(() => inputText.value.length)
const canTranslate = computed(() => inputText.value.trim().length > 0 && !loading.value)
// 源语言选 auto 时，后端不支持把 auto 当目标语言，交换时需处理
const canSwap = computed(() => fromLang.value !== 'auto')

/* ---------------- 生命周期 ---------------- */
onMounted(async () => {
  loadHistory()
  await checkApiKey()
})

/* ---------------- 历史记录持久化 ---------------- */
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) history.value = JSON.parse(raw)
  } catch {
    history.value = []
  }
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
  } catch {
    // ignore
  }
}

function pushHistory(item) {
  history.value.unshift(item)
  if (history.value.length > MAX_HISTORY) {
    history.value = history.value.slice(0, MAX_HISTORY)
  }
  saveHistory()
}

function clearHistory() {
  history.value = []
  saveHistory()
}

/* ---------------- 方法 ---------------- */
async function checkApiKey() {
  try {
    const resp = await fetch('/api/health')
    const data = await resp.json()
    apiKeyReady.value = Boolean(data?.apiKeyConfigured)
  } catch {
    apiKeyReady.value = false
  }
}

async function handleTranslate() {
  errorMsg.value = ''
  resultText.value = ''

  if (!inputText.value.trim()) {
    errorMsg.value = '请输入要翻译的文本'
    return
  }
  if (inputText.value.length > 3000) {
    errorMsg.value = '文本长度不能超过 3000 字符'
    return
  }
  if (!apiKeyReady.value) {
    showKeyModal.value = true
    return
  }

  loading.value = true
  try {
    const resp = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText.value, to_lang: toLang.value }),
    })
    const data = await resp.json()
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        throw new Error('API Key 无效或无权限，请检查 Key 是否正确（' + (data?.error || '') + '）')
      }
      throw new Error(data?.error || '翻译失败（HTTP ' + resp.status + '）')
    }
    resultText.value = data.translate || ''

    // 写入历史记录
    if (resultText.value) {
      pushHistory({
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        time: Date.now(),
        source: inputText.value,
        result: resultText.value,
        fromLang: fromLang.value,
        toLang: toLang.value,
        langList: LANGUAGES,
      })
    }
  } catch (err) {
    errorMsg.value = err.message || '翻译请求出错'
  } finally {
    loading.value = false
  }
}

async function copyText(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // ignore
  }
}

function copyResult() {
  copyText(resultText.value)
}

function swapLangs() {
  if (!canSwap.value) return
  const tmpFrom = fromLang.value
  fromLang.value = toLang.value
  toLang.value = tmpFrom
  // 若已有译文，把译文作为新输入，便于反向翻译
  if (resultText.value) {
    inputText.value = resultText.value
    resultText.value = ''
  }
}

function clearAll() {
  inputText.value = ''
  resultText.value = ''
  errorMsg.value = ''
}

function onKeySaved() {
  showKeyModal.value = false
  checkApiKey()
}
</script>

<template>
  <div class="app">
    <!-- 顶部 -->
    <header class="app-header">
      <div class="brand">
        <img src="/logo.svg" alt="译尘" class="logo" />
        <div class="brand-text">
          <h1 class="title grad-text">译尘</h1>
          <p class="subtitle">Yichen的翻译工具</p>
        </div>
      </div>

      <button class="ghost-btn key-btn" @click="showKeyModal = true">
        <span class="dot" :class="{ ok: apiKeyReady }"></span>
        {{ apiKeyReady ? 'API Key 已配置' : '配置 API Key' }}
      </button>
    </header>

    <!-- 主体 -->
    <main class="app-main">
      <!-- 语言选择 + 操作 -->
      <section class="toolbar glass-card">
        <div class="lang-group">
          <label class="lang-label">
            <span class="lang-flag">源</span>
            源语言
          </label>
          <GradientSelect
            v-model="fromLang"
            :options="fromLangOptions"
            id="from-lang"
          />
        </div>

        <button
          class="swap-btn"
          :class="{ disabled: !canSwap }"
          :disabled="!canSwap"
          @click="swapLangs"
          title="交换源语言与目标语言"
        >
          ⇄
        </button>

        <div class="lang-group">
          <label class="lang-label">
            <span class="lang-flag">目标</span>
            目标语言
          </label>
          <GradientSelect
            v-model="toLang"
            :options="LANGUAGES"
            id="to-lang"
          />
        </div>

        <div class="toolbar-actions">
          <button class="ghost-btn" @click="clearAll" :disabled="!inputText && !resultText">
            清空
          </button>
          <button class="grad-btn" :disabled="!canTranslate" @click="handleTranslate">
            <span v-if="!loading">翻译</span>
            <span v-else class="loading-dot">翻译中…</span>
          </button>
        </div>
      </section>

      <!-- 输入 / 输出 -->
      <section class="grid">
        <!-- 输入 -->
        <div class="pane glass-card">
          <div class="pane-head">
            <h2 class="pane-title">原文</h2>
            <span class="counter" :class="{ over: charCount > 3000 }">{{ charCount }} / 3000</span>
          </div>
          <textarea
            ref="inputScrollRef"
            v-model="inputText"
            class="field pane-body input-area"
            placeholder="在此输入要翻译的文本…"
            maxlength="3500"
            @scroll="onInputScroll"
          ></textarea>
        </div>

        <!-- 输出 -->
        <div class="pane glass-card result-pane">
          <div class="pane-head">
            <h2 class="pane-title grad-text">译文</h2>
            <button
              v-if="resultText"
              class="ghost-btn small"
              @click="copyResult"
              title="复制译文"
            >
              复制
            </button>
          </div>
          <div
            ref="resultScrollRef"
            class="pane-body result-body"
            @scroll="onResultScroll"
          >
            <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
            <p v-else-if="loading" class="placeholder placeholder-loading">
              <span class="spinner"></span>
              正在翻译…
            </p>
            <p v-else-if="resultText" class="result-text">{{ resultText }}</p>
            <p v-else class="placeholder">译文将显示在这里</p>
          </div>
        </div>
      </section>

      <!-- 历史记录 -->
      <HistoryList
        :items="history"
        @clear="clearHistory"
        @copy="copyText"
      />
    </main>

    <!-- 底部 -->
    <footer class="app-footer">
      <span>Powered by <a href="https://uapis.cn" target="_blank" rel="noopener">UapiPro</a></span>
      <span class="sep">·</span>
      <span>本地部署 · API Key 由后端安全保管</span>
    </footer>

    <!-- API Key 配置弹窗 -->
    <ApiKeyModal v-if="showKeyModal" @close="showKeyModal = false" @saved="onKeySaved" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 28px 24px;
}

/* ---------- 顶部 ---------- */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 16px;
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: 16px;
}
.logo {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  object-fit: cover;
  box-shadow: 0 10px 30px -10px rgba(124, 58, 237, 0.6);
}
.title {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.key-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.18);
  transition: background var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.dot.ok {
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
}

/* ---------- 主体 ---------- */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 工具栏：宽度自适应内容，紧靠翻译按钮 */
.toolbar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 18px 22px;
  flex-wrap: nowrap;
  width: fit-content;
  max-width: 100%;
}
.lang-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* 紧凑布局：固定宽度，右侧贴近翻译按钮 */
  width: 160px;
  flex-shrink: 0;
}
.lang-label {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.lang-flag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--grad-soft);
  color: var(--c-violet);
  font-weight: 600;
}

/* 交换按钮 */
.swap-btn {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  align-self: end;
  margin-bottom: 2px;
  border-radius: 50%;
  border: 1px solid transparent;
  background:
    linear-gradient(#fff, #fff) padding-box,
    var(--grad-border) border-box;
  color: var(--c-violet);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.swap-btn:hover:not(.disabled) {
  transform: rotate(180deg) scale(1.05);
  color: var(--c-blue);
  box-shadow: 0 6px 16px -6px rgba(124, 58, 237, 0.4);
}
.swap-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  align-self: end;
  padding-bottom: 2px;
  /* 整体向右移动一个清空按钮的宽度 */
  margin-left: 72px;
}

/* 网格：输入 / 输出 */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.pane {
  padding: 22px;
  display: flex;
  flex-direction: column;
  min-height: 340px;
}
.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.pane-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-strong);
}
.counter {
  font-size: 12px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.counter.over {
  color: #ef4444;
  font-weight: 600;
}
.pane-body {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0;
}
/* 原文输入框：自带内边距，聚焦蓝边与文字留出间距 */
.input-area {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-md);
  border: 1px solid rgba(148, 163, 184, 0.3);
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease),
    background var(--dur) var(--ease);
}
.input-area:focus {
  border-color: transparent;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 2px var(--c-blue), 0 8px 20px -8px rgba(37, 99, 235, 0.3);
}
.result-body {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-md);
  overflow-y: auto;
}
.result-text {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-strong);
  white-space: pre-wrap;
  word-break: break-word;
}
.placeholder {
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.7;
  display: block;
  /* 顶部对齐，与原文框 placeholder 一致 */
  margin: 0;
}
/* loading 态需要横向排列 spinner */
.placeholder-loading {
  display: flex;
  align-items: center;
  gap: 10px;
}
.error-msg {
  color: #ef4444;
  font-size: 14px;
  line-height: 1.7;
}
.small {
  padding: 6px 14px;
  font-size: 13px;
}

/* 加载动画 */
.loading-dot::after {
  content: '';
  display: inline-block;
  width: 6px;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(124, 58, 237, 0.25);
  border-top-color: var(--c-violet);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---------- 底部 ---------- */
.app-footer {
  margin-top: 32px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-muted);
}
.app-footer a {
  color: var(--c-blue);
  text-decoration: none;
}
.app-footer a:hover {
  text-decoration: underline;
}
.sep {
  opacity: 0.5;
}

/* ---------- 响应式 ---------- */
@media (max-width: 820px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .toolbar {
    flex-wrap: wrap;
    align-items: flex-end;
    width: 100%;
  }
  .swap-btn {
    align-self: center;
    margin: 4px 0;
    transform: rotate(90deg);
  }
  .swap-btn:hover:not(.disabled) {
    transform: rotate(270deg) scale(1.05);
  }
  .lang-group {
    width: auto;
    flex: 1;
    min-width: 140px;
  }
  .toolbar-actions {
    justify-content: flex-end;
    margin-left: 0;
  }
  .app {
    padding: 20px 16px;
  }
  .title {
    font-size: 24px;
  }
}
</style>
