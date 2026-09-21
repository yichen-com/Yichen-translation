// 历史记录：localStorage 持久化，最多保留 50 条
import { ref } from 'vue'
import type { HistoryItem } from '@/types'

const HISTORY_KEY = 'gradient_translate_history'
const MAX_HISTORY = 50

export function useHistory() {
  const history = ref<HistoryItem[]>([])

  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) history.value = JSON.parse(raw)
  }
  catch {
    history.value = []
  }

  function save() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
    }
    catch {
      // 忽略持久化失败（如隐私模式）
    }
  }

  function push(item: HistoryItem) {
    history.value.unshift(item)
    if (history.value.length > MAX_HISTORY)
      history.value = history.value.slice(0, MAX_HISTORY)
    save()
  }

  function clear() {
    history.value = []
    save()
  }

  return { history, push, clear }
}
