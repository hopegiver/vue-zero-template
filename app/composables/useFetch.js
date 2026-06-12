/**
 * useFetch — 범용 API fetch 헬퍼
 *
 * 사용법:
 *   import { useFetch } from '../composables/useFetch.js'
 *
 *   async mounted() {
 *     const { data, error } = await useFetch('/api/users')
 *     if (error) { this.error = error; return }
 *     this.users = data.users
 *   }
 *
 * POST:
 *   const { data, error } = await useFetch('/api/posts', {
 *     method: 'POST',
 *     body: { title: '제목', content: '내용' },
 *   })
 *
 * 인증 토큰은 localStorage.token 이 있으면 자동으로 Authorization 헤더에 추가됩니다.
 */
export async function useFetch(url, options = {}) {
  const { method = 'GET', body } = options

  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { data: null, error: data?.message ?? `HTTP ${res.status}` }
    return { data, error: null }
  } catch {
    return { data: null, error: '네트워크 오류가 발생했습니다.' }
  }
}
