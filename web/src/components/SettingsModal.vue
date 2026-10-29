<script setup>
import { ref } from 'vue'

const props = defineProps({
  // 后端下发的引擎摘要列表（能力与密钥配置状态）
  providers: { type: Array, default: () => [] },
  initialProvider: { type: String, default: 'uapi' },
})

const emit = defineEmits(['close', 'select'])

const selectedId = ref(props.initialProvider)

function choose(provider) {
  if (provider.id === selectedId.value) {
    emit('close')
    return
  }
  emit('select', provider.id)
}

function envKeys(provider) {
  return provider.credentialFields.map((field) => field.envKey).join(' · ')
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal glass-card">
      <h2 class="modal-title grad-text">翻译引擎</h2>
      <p class="modal-desc">
        密钥保存在站点设置的 Secrets 中，页面只显示配置状态、不接触密钥。
        修改密钥后重新打开页面即可生效。
      </p>

      <div class="provider-list">
        <button
          v-for="p in providers"
          :key="p.id"
          class="provider-card"
          :class="{ selected: p.id === selectedId }"
          @click="choose(p)"
        >
          <span class="dot" :class="{ ok: p.configured }"></span>
          <span class="provider-main">
            <span class="provider-name">{{ p.name }}</span>
            <span class="provider-env">{{ envKeys(p) }}</span>
          </span>
          <span class="provider-status" :class="{ ok: p.configured }">
            {{ p.configured ? '已配置' : '缺密钥' }}
          </span>
        </button>
      </div>

      <p v-if="!providers.length" class="engine-hint">引擎列表加载中，请稍候或刷新页面…</p>
      <p v-else class="engine-hint">点击任一引擎即可切换，选择会被记住。</p>

      <div class="docs">
        <span class="docs-label">获取密钥：</span>
        <a
          v-for="p in providers"
          :key="p.id"
          :href="p.docsUrl"
          target="_blank"
          rel="noopener"
        >{{ p.name }}</a>
      </div>

      <div class="actions">
        <button class="grad-btn" @click="emit('close')">完成</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: 20px;
}
.modal {
  width: 100%;
  max-width: 480px;
  padding: 28px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 8px;
}
.modal-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.7;
  margin-bottom: 16px;
}

/* 引擎列表 */
.provider-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.provider-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}
.provider-card:hover {
  border-color: rgba(124, 58, 237, 0.4);
  background: rgba(255, 255, 255, 0.8);
}
.provider-card.selected {
  border-color: rgba(124, 58, 237, 0.55);
  background: #fff;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
}
.dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.18);
  transition: background var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.dot.ok {
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
}
.provider-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.provider-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-strong);
}
.provider-env {
  font-size: 11px;
  color: var(--text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.provider-status {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
}
.provider-status.ok {
  color: #10b981;
}

.engine-hint {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.7;
  margin-bottom: 12px;
}
.docs {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 18px;
}
.docs a {
  color: var(--c-blue);
  text-decoration: none;
}
.docs a:hover {
  text-decoration: underline;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
