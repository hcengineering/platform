export const PlatformURI = process.env.PLATFORM_URI as string
export const PlatformTransactor = process.env.PLATFORM_TRANSACTOR as string
export const PlatformUser = process.env.PLATFORM_USER as string
export const PlatformToken = process.env.PLATFORM_TOKEN as string
export const PlatformSetting = process.env.SETTING as string

function toHex (value: number, chars: number): string {
  const result = value.toString(16)
  if (result.length < chars) {
    return '0'.repeat(chars - result.length) + result
  }
  return result
}

let counter = (Math.random() * (1 << 24)) | 0
const random = toHex((Math.random() * (1 << 24)) | 0, 6) + toHex((Math.random() * (1 << 16)) | 0, 4)

function timestamp (): string {
  const time = (Date.now() / 1000) | 0
  return toHex(time, 8)
}

function count (): string {
  const val = counter++ & 0xffffff
  return toHex(val, 6)
}

/**
 * @public
 * @returns
 */
export function generateId (len = 100): string {
  const v = timestamp() + random
  let s = v.length - len
  if (s < 0) {
    s = 0
  }
  const r = v.slice(s, v.length) + count()
  return r
}
