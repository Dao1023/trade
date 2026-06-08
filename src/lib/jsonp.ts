/**
 * JSONP 请求封装
 */
export function jsonp<T>(url: string, callbackParam = 'cb'): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')

    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('JSONP timeout'))
    }, 15000)

    function cleanup() {
      clearTimeout(timer)
      delete (window as any)[cbName]
      script.remove()
    }

    ;(window as any)[cbName] = (data: T) => {
      cleanup()
      resolve(data)
    }

    const sep = url.includes('?') ? '&' : '?'
    script.src = `${url}${sep}${callbackParam}=${cbName}`
    script.onerror = () => {
      cleanup()
      reject(new Error('JSONP load failed'))
    }
    document.head.appendChild(script)
  })
}
