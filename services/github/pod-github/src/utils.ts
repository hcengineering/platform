import { Doc } from '@hcengineering/core'
import { deepEqual } from 'fast-equals'

export function equalExceptKeys<T extends Doc> (a: T | T[], b: T | T[], keys: (keyof T)[]): boolean {
  function equal (a: T, b: T): boolean {
    const _a = { ...a }
    const _b = { ...b }
    for (const key of keys) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      if (key in _a) delete _a[key]
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      if (key in _b) delete _b[key]
    }
    return deepEqual(_a, _b)
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }
    for (let i = 0; i < a.length; i++) {
      if (!equal(a[i], b[i])) {
        return false
      }
    }
    return true
  }
  if (!Array.isArray(a) && !Array.isArray(b)) {
    return equal(a, b)
  }
  return false
}
