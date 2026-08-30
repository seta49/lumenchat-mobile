/**
 * ID generator pengganti crypto.randomUUID (tidak tersedia di semua runtime
 * React Native/Hermes). Cukup unik untuk identifikasi message/thread/provider.
 */
let counter = 0;

export function newId(): string {
  counter = (counter + 1) % 0xffff;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}