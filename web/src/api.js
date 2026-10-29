// 站点同源 Function 请求封装：区分访问受限、网关异常与业务错误
export class ApiError extends Error {
  constructor(message, code, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export async function requestJson(url, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')

  let response
  try {
    response = await fetch(url, { ...init, headers, credentials: 'same-origin' })
  } catch {
    throw new ApiError('网络请求失败，请检查网络后重试', 'network_error')
  }

  if (response.status === 401 || response.status === 403) {
    throw new ApiError('没有访问权限，请重新登录站点后再试', 'access_denied', response.status)
  }
  const contentType = response.headers.get('content-type') || ''
  if (response.redirected || !contentType.includes('application/json')) {
    throw new ApiError('站点服务返回了异常响应，请刷新页面重试', 'invalid_response', response.status)
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new ApiError('站点服务返回了无法解析的数据', 'invalid_response', response.status)
  }

  const body = data && typeof data === 'object' ? data : null
  if (!response.ok || body?.ok === false) {
    const code = typeof body?.error?.code === 'string' ? body.error.code : 'request_failed'
    const message = typeof body?.error?.message === 'string' && body.error.message
      ? body.error.message
      : '翻译请求失败，请稍后重试'
    throw new ApiError(message, code, response.status)
  }

  return body
}
