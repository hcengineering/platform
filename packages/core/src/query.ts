import { Doc } from './classes'
import { createPredicates, isPredicate } from './predicate'
import { SortingQuery } from './storage'

/**
 * @public
 */
export function findProperty (objects: Doc[], propertyKey: string, value: any): Doc[] {
  if (isPredicate(value)) {
    const preds = createPredicates(value, propertyKey)
    for (const pred of preds) {
      objects = pred(objects)
    }
    return objects
  }
  const result: Doc[] = []
  for (const object of objects) {
    const val = getNestedValue(propertyKey, object)
    if ((val === value) || isArrayValueCheck(val, value)) {
      result.push(object)
    }
  }
  return result
}

function isArrayValueCheck<T, P> (val: T, value: P): boolean {
  return Array.isArray(val) && !Array.isArray(value) && val.includes(value)
}
/**
 * @public
 */
export function getNestedValue (key: string, doc: Doc): any {
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
    result.push(...arrayOrValue(getNestedValue(name, v)))
  }
  return result
}

function arrayOrValue (vv: any): any[] {
  return Array.isArray(vv) ? vv : [vv]
}

/**
 * @public
 */
export function resultSort<T extends Doc> (result: T[], sortOptions: SortingQuery<T>): void {
  const sortFunc = (a: any, b: any): number => {
    for (const key in sortOptions) {
      const aValue = getValue(key, a)
      const bValue = getValue(key, b)
      const result = getSortingResult(aValue, bValue)
      if (result !== 0) return result * (sortOptions[key] as number)
    }
    return 0
  }
  result.sort(sortFunc)
}

function getSortingResult (aValue: any, bValue: any): number {
  if (typeof aValue === 'undefined') {
    return typeof bValue === 'undefined' ? 0 : -1
  }
  if (typeof bValue === 'undefined') {
    return 1
  }
  return typeof aValue === 'string' ? aValue.localeCompare(bValue) : (aValue - bValue)
}

function getValue (key: string, obj: any): any {
  let value = getNestedValue(key, obj)
  if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  return value
}
