import { Doc } from './classes'

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
