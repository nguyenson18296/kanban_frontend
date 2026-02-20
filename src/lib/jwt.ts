export interface JwtPayload {
  sub?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

export function decodeJwt(token: string): JwtPayload {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 parts, got ' + parts.length)
  }

  try {
    const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + (c.codePointAt(0)?.toString(16).padStart(2, '0') ?? '00'))
        .join(''),
    )
    return JSON.parse(json) as JwtPayload
  } catch {
    throw new Error('Invalid JWT: failed to decode payload')
  }
}
