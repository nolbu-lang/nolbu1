/**
 * 고유 ID 생성기.
 * crypto.randomUUID 는 보안 컨텍스트(HTTPS/localhost)에서만 동작하므로,
 * 일반 HTTP(LAN) 접속 환경에서도 안전하게 쓰도록 폴백을 둔다.
 */
export function generateId(): string {
  const c = globalThis.crypto

  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }

  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
      .slice(6, 8)
      .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
  }

  return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`
}
