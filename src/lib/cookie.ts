interface CookieOptions {
  maxAge?: number
  path?: string
  sameSite?: 'Strict' | 'Lax' | 'None'
  secure?: boolean
}

export function getCookie(name: string): string | null {
  const re = new RegExp(
    '(?:^|; )' + name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`) + '=([^;]*)',
  )
  const match = re.exec(document.cookie)
  return match ? decodeURIComponent(match[1]) : null
}

// Secure flag auto-enables on HTTPS (production) and stays off on HTTP (localhost dev).
// Note: httpOnly cannot be set from client-side JS — that requires a server Set-Cookie header.
export function setCookie(name: string, value: string, options: CookieOptions = {}) {
  const { maxAge, path = '/', sameSite = 'Strict', secure = location.protocol === 'https:' } =
    options

  let cookie = `${name}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`
  if (maxAge != null) cookie += `; max-age=${maxAge}`
  if (secure) cookie += '; Secure'

  document.cookie = cookie
}

export function removeCookie(name: string, path = '/') {
  document.cookie = `${name}=; path=${path}; max-age=0`
}
