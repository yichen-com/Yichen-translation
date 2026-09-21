<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['clear', 'copy'])

const empty = computed(() => props.items.length === 0)

// 清空确认弹窗
const showConfirm = ref(false)

// 展开的记录 id 集合
const expandedIds = ref(new Set())

// 溢出状态：key = `${itemId}-source` / `${itemId}-result`
const overflowMap = ref({})

// 文本元素引用
const textRefs = ref({})

function toggleExpand(id) {
  const set = new Set(expandedIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  expandedIds.value = set
  // 展开/收起后重新检测溢出（展开后不再溢出，收起后可能又溢出）
  nextTick(checkOverflow)
}

function isExpanded(id) {
  return expandedIds.value.has(id)
}

// 某条记录是否需要显示展开/收起按钮（原文或译文任一溢出，或已展开）
function showToggleBtn(id) {
  return (
    isOverflow(id + '-source') ||
    isOverflow(id + '-result') ||
    isExpanded(id)
  )
}

function setTextRef(el, key) {
  if (el) textRefs.value[key] = el
  else delete textRefs.value[key]
}

/**
 * 检测每个文本元素是否溢出
 */
function checkOverflow() {
  const map = {}
  for (const key in textRefs.value) {
    const el = textRefs.value[key]
    if (el) {
      // 仅对未展开的元素检测（展开的必然不溢出）
      const itemId = key.replace(/-(source|result)$/, '')
      if (isExpanded(itemId)) {
        map[key] = false
      } else {
        map[key] = el.scrollWidth - el.clientWidth > 2
      }
    }
  }
  overflowMap.value = map
}

function isOverflow(key) {
  return Boolean(overflowMap.value[key])
}

function handleClearClick() {
  showConfirm.value = true
}

function confirmClear() {
  showConfirm.value = false
  emit('clear')
}

function cancelClear() {
  showConfirm.value = false
}

function formatTime(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function langName(code, list) {
  const found = list.find((l) => l.code === code)
  return found ? found.name : code
}

watch(
  () => props.items,
  () => {
    nextTick(checkOverflow)
  },
  { deep: true }
)

onMounted(() => {
  nextTick(checkOverflow)
  window.addEventListener('resize', checkOverflow)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkOverflow)
})
</script>

<template>
  <div class="history glass-card">
    <div class="history-head">
      <h2 class="history-title">
        <span class="icon">⟳</span> 历史记录
        <span class="count">{{ items.length }}</span>
      </h2>
      <button v-if="!empty" class="ghost-btn small danger" @click="handleClearClick">
        清空记录
      </button>
    </div>

    <div v-if="empty" class="empty">暂无翻译记录</div>

    <ul v-else class="history-list">
      <li v-for="item in items" :key="item.id" class="history-item">
        <!-- 顶部元信息：语言 + 时间 + 复制按钮（固定在右上角，不受展开影响） -->
        <div class="item-meta">
          <span class="item-lang grad-text">
            {{ langName(item.fromLang, item.langList) }} → {{ langName(item.toLang, item.langList) }}
          </span>
          <div class="meta-right">
            <span class="item-time">{{ formatTime(item.time) }}</span>
            <button
              class="icon-btn copy-btn"
              @click="emit('copy', item.result)"
              title="复制译文"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- 主区域：左侧内容 + 右侧展开按钮列 -->
        <div class="item-body">
          <!-- 原文 / 译文 左右布局 -->
          <div class="item-content" :class="{ expanded: isExpanded(item.id) }">
            <!-- 左：原文 -->
            <div class="cell">
              <span class="cell-tag">原文</span>
              <p
                class="cell-text"
                :ref="(el) => setTextRef(el, item.id + '-source')"
                :title="item.source"
              >{{ item.source }}</p>
            </div>

            <!-- 中：箭头（展开时始终垂直居中） -->
            <span class="cell-arrow">→</span>

            <!-- 右：译文 -->
            <div class="cell result-cell">
              <span class="cell-tag grad">译文</span>
              <p
                class="cell-text"
                :ref="(el) => setTextRef(el, item.id + '-result')"
                :title="item.result"
              >{{ item.result }}</p>
            </div>
          </div>

          <!-- 展开按钮列：固定位置，不显示文字内容，仅图标 -->
          <div class="toggle-col">
            <button
              v-if="showToggleBtn(item.id)"
              class="toggle-btn"
              @click="toggleExpand(item.id)"
              :title="isExpanded(item.id) ? '收起' : '展开'"
            >
              <!-- 收起态：下尖括号 ⌄ -->
              <svg v-if="!isExpanded(item.id)" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 6 8 10 12 6"></polyline>
              </svg>
              <!-- 展开态：上尖括号 ⌃ -->
              <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 10 8 6 12 10"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </li>
    </ul>

    <!-- 清空确认弹窗：Teleport 到 body，确保居中且不影响历史区 -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="showConfirm" class="confirm-overlay" @click.self="cancelClear">
          <div class="confirm-modal glass-card">
            <h3 class="confirm-title">确认清空历史记录？</h3>
            <p class="confirm-desc">将删除全部 {{ items.length }} 条翻译记录，此操作不可撤销。</p>
            <div class="confirm-actions">
              <button class="ghost-btn" @click="cancelClear">取消</button>
              <button class="grad-btn danger-btn" @click="confirmClear">确认清空</button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<style scoped>
.history {
  padding: 22px 24px;
}
.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.history-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-strong);
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon {
  font-size: 18px;
  color: var(--c-violet);
}
.count {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-violet);
  background: var(--grad-soft);
  padding: 2px 8px;
  border-radius: 10px;
}
.empty {
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  padding: 28px 0;
}

.history-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 460px;
  overflow-y: auto;
  padding-right: 4px;
}
.history-item {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-md);
  border: 1px solid rgba(148, 163, 184, 0.18);
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.history-item:hover {
  border-color: rgba(124, 58, 237, 0.35);
  background: rgba(255, 255, 255, 0.75);
}

/* 元信息行 */
.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}
.item-lang {
  font-weight: 600;
  font-size: 12px;
}
.meta-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.item-time {
  /* 时间标签向左偏移，给复制按钮留出原位置 */
  margin-right: 10px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* 复制按钮：固定在 meta 行右侧，不受展开/折叠影响 */
.copy-btn {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  opacity: 0;
  transition: opacity var(--dur) var(--ease), color var(--dur) var(--ease),
    border-color var(--dur) var(--ease), background var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}
.history-item:hover .copy-btn {
  opacity: 1;
}
.copy-btn:hover {
  color: var(--c-violet);
  border-color: rgba(124, 58, 237, 0.5);
  background: #fff;
  transform: scale(1.1);
}

/* 内容区：左右布局 */
.item-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.item-content.expanded {
  align-items: stretch;
}
.cell {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.item-content.expanded .cell {
  align-items: flex-start;
}
.result-cell {
  position: relative;
}
.cell-tag {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  background: rgba(148, 163, 184, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  /* 展开时 tag 顶部对齐 */
  align-self: center;
}
.item-content.expanded .cell-tag {
  align-self: flex-start;
  margin-top: 2px;
}
.cell-tag.grad {
  color: var(--c-violet);
  background: var(--grad-soft);
}
.cell-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-base);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-arrow {
  flex-shrink: 0;
  color: var(--c-blue);
  font-size: 14px;
  font-weight: 700;
  /* 展开时垂直居中（align-items: stretch 下用 align-self） */
  align-self: center;
}

/* 展开状态：文字换行显示全部 */
.item-content.expanded .cell-text {
  white-space: normal;
  word-break: break-word;
}

/* 主区域：内容 + 展开按钮列 */
.item-body {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

/* 展开按钮列：固定宽度，不显示文字，仅放图标 */
.toggle-col {
  flex-shrink: 0;
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 展开/收起按钮：纯图标，居中在按钮列 */
.toggle-btn {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.85);
  border-radius: 6px;
  color: var(--c-violet);
  cursor: pointer;
  padding: 0;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease),
    background var(--dur) var(--ease), transform var(--dur) var(--ease);
}
.toggle-btn:hover {
  color: #fff;
  background: var(--c-violet);
  border-color: var(--c-violet);
  transform: scale(1.1);
}

/* 清空确认弹窗：Teleport 到 body，fixed 定位确保居中且不影响历史区 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}
.confirm-modal {
  width: 100%;
  max-width: 380px;
  padding: 24px;
}
.confirm-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-strong);
  margin-bottom: 8px;
}
.confirm-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 18px;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.danger-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 8px 20px -8px rgba(239, 68, 68, 0.5);
}
.danger-btn:hover:not(:disabled) {
  box-shadow: 0 12px 24px -10px rgba(239, 68, 68, 0.6);
}

.small {
  padding: 6px 14px;
  font-size: 13px;
}
.danger {
  color: #ef4444;
}
.danger:hover {
  box-shadow: 0 6px 16px -6px rgba(239, 68, 68, 0.3);
}

/* 响应式：窄屏改为上下 */
@media (max-width: 640px) {
  .item-content {
    flex-direction: column;
    align-items: stretch;
  }
  .cell-arrow {
    transform: rotate(90deg);
    align-self: center;
  }
  .copy-btn {
    opacity: 1;
  }
}
</style>
