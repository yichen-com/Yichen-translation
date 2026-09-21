<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] }, // [{ code, name }]
  label: { type: String, default: '' },
  id: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootRef = ref(null)
const triggerRef = ref(null)
const listRef = ref(null)

// 标记：刚打开的一小段时间内忽略外部关闭事件，避免首次点击闪退
const justOpened = ref(false)

// 浮层定位坐标
const listStyle = ref({ top: '0px', left: '0px', width: '0px' })

const selected = computed(() =>
  props.options.find((o) => o.code === props.modelValue)
)

function updatePosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const viewportH = window.innerHeight
  const listMaxH = 260
  const spaceBelow = viewportH - rect.bottom
  const openBelow = spaceBelow >= listMaxH + 20 || spaceBelow >= rect.top
  listStyle.value = {
    top: openBelow ? `${rect.bottom + 6}px` : `${rect.top - listMaxH - 6}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

function toggle() {
  if (open.value) {
    // 已打开则关闭
    open.value = false
    return
  }
  // 打开前先计算位置（此时 triggerRef 已存在），避免浮层首次渲染在错误位置
  updatePosition()
  open.value = true
  // 标记刚打开，100ms 内忽略 scroll/clickoutside
  justOpened.value = true
  setTimeout(() => {
    justOpened.value = false
  }, 100)
  nextTick(() => {
    updatePosition()
    const sel = listRef.value?.querySelector('.gsel-option.selected')
    sel?.scrollIntoView({ block: 'nearest' })
  })
}

function select(code) {
  emit('update:modelValue', code)
  open.value = false
}

function handleClickOutside(e) {
  if (!open.value || justOpened.value) return
  const target = e.target
  // 点击在触发器内 → 不关闭（toggle 会处理）
  if (rootRef.value && rootRef.value.contains(target)) return
  // 点击在浮层内 → 不关闭
  if (listRef.value && listRef.value.contains(target)) return
  // 其他区域 → 关闭
  open.value = false
}

function handleEsc(e) {
  if (e.key === 'Escape') open.value = false
}

function handleScroll() {
  if (open.value && !justOpened.value) {
    open.value = false
  }
}

function handleResize() {
  if (open.value) updatePosition()
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleEsc)
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleEsc)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="gsel" ref="rootRef">
    <!-- 触发器 -->
    <button
      type="button"
      ref="triggerRef"
      class="gsel-trigger"
      :class="{ active: open }"
      @click="toggle"
      :id="id"
    >
      <span class="gsel-value">{{ selected ? selected.name : '请选择' }}</span>
      <svg
        class="gsel-arrow"
        :class="{ up: open }"
        viewBox="0 0 16 16" width="12" height="12"
        fill="none" stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <polyline points="4 6 8 10 12 6"></polyline>
      </svg>
    </button>

    <!-- 浮层选项列表：teleport 到 body，fixed 定位避免被遮挡 -->
    <teleport to="body">
      <transition name="gsel-slide">
        <ul
          v-if="open"
          class="gsel-list"
          ref="listRef"
          :style="listStyle"
          @mousedown.stop
        >
          <li
            v-for="opt in options"
            :key="opt.code"
            class="gsel-option"
            :class="{ selected: opt.code === modelValue }"
            @click="select(opt.code)"
            @mousedown.prevent
          >
            {{ opt.name }}
          </li>
        </ul>
      </transition>
    </teleport>
  </div>
</template>

<style scoped>
.gsel {
  position: relative;
  display: block;
  width: 100%;
}

/* 触发器 */
.gsel-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid transparent;
  background-image: linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)),
    var(--grad-border);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  color: var(--text-strong);
  font-family: inherit;
  outline: none;
  transition: box-shadow var(--dur) var(--ease),
    background-image var(--dur) var(--ease);
}
.gsel-trigger:hover {
  background-image: linear-gradient(rgba(255, 255, 255, 1), rgba(255, 255, 255, 1)),
    var(--grad-border);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}
.gsel-trigger.active {
  box-shadow: 0 0 0 2px var(--c-blue), 0 8px 20px -8px rgba(37, 99, 235, 0.3);
}
.gsel-value {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gsel-arrow {
  flex-shrink: 0;
  color: var(--c-violet);
  transition: transform var(--dur) var(--ease), color var(--dur) var(--ease);
}
.gsel-trigger:hover .gsel-arrow {
  color: var(--c-blue);
}
.gsel-arrow.up {
  transform: rotate(180deg);
}

/* 选项 */
.gsel-option {
  padding: 9px 12px;
  font-size: 14px;
  color: var(--text-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease),
    padding-left var(--dur) var(--ease);
}
.gsel-option:hover {
  background: var(--grad-soft);
  color: var(--c-violet);
  padding-left: 16px;
}
.gsel-option.selected {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(6, 182, 212, 0.12));
  color: var(--c-violet);
  font-weight: 600;
}

/* 淡入 + 向下滑动过渡 */
.gsel-slide-enter-active,
.gsel-slide-leave-active {
  transition: opacity 220ms var(--ease), transform 220ms var(--ease);
}
.gsel-slide-enter-from,
.gsel-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scaleY(0.92);
}
.gsel-slide-enter-to,
.gsel-slide-leave-from {
  opacity: 1;
  transform: translateY(0) scaleY(1);
}
</style>

<style>
/* 浮层列表：全局样式（teleport 到 body，需脱离 scoped） */
.gsel-list {
  position: fixed;
  z-index: 9999;
  list-style: none;
  margin: 0;
  padding: 6px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: var(--radius-md);
  box-shadow: 0 16px 40px -12px rgba(37, 99, 235, 0.35);
  max-height: 260px;
  overflow-y: auto;
}
</style>
