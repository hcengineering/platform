import { PlatformError, Severity, Status } from '@hcengineering/platform'
import { Doc } from './classes'
import core from './component'
import justClone from 'just-clone'

/**
 * @public
 */
export function getObjectValue (key: string, doc: Doc): any {
  // Check dot notation
  if (key.length === 0) {
    return doc
  }
  key = key.split('\\$').join('$')
  const dots = key.split('.')
  // Replace escapting, since memdb is not escape keys

  // We have dots, so iterate in depth
  let pos = 0
  let value = doc as any
  for (const d of dots) {
    if (Array.isArray(value) && isNestedArrayQuery(value, d)) {
      // Array and d is not an indexed field.
      // So return array of nested values.
      return getNestedArrayValue(value, dots.slice(pos).join('.'))
    }
    value = value?.[d]
    pos++
  }
  return value
}

/**
 * @public
 */
export function setObjectValue (key: string, doc: Doc, newValue: any): void {
  // Check dot notation
  if (key.length === 0) {
    return
  }
  key = key.split('\\$').join('$')
  let dots = key.split('.')
  // Replace escapting, since memdb is not escape keys

  const last = dots[dots.length - 1]
  dots = dots.slice(0, -1)

  // We have dots, so iterate in depth
  let value = doc as any
  for (const d of dots) {
    if (Array.isArray(value) && isNestedArrayQuery(value, d)) {
      // Arrays are not supported
      throw new PlatformError(new Status(Severity.ERROR, core.status.ObjectNotFound, { _id: 'dots' }))
    }
    const lvalue = value?.[d]
    if (lvalue === undefined) {
      value[d] = {}
      value = value?.[d]
    } else {
      value = lvalue
    }
  }
  value[last] = justClone(newValue)
  return value
}

function isNestedArrayQuery (value: any, d: string): boolean {
  return Number.isNaN(Number.parseInt(d)) && value?.[d as any] === undefined
}

function getNestedArrayValue (value: any[], name: string): any[] {
  const result = []
  for (const v of value) {
    result.push(...arrayOrValue(getObjectValue(name, v)))
  }
  return result
}

function arrayOrValue (vv: any): any[] {
  return Array.isArray(vv) ? vv : [vv]
}
