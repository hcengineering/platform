import { DocumentQuery } from '.'
import { Doc } from './classes'
import { getObjectValue } from './objvalue'
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
    const val = getObjectValue(propertyKey, object)
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
  let value = getObjectValue(key, obj)
  if (typeof value === 'object') {
    value = JSON.stringify(value)
  }
  return value
}
/**
 * @public
 */
export function matchQuery<T extends Doc> (docs: Doc[], query: DocumentQuery<T>): Doc[] {
  let result = [...docs]
  for (const key in query) {
    if (key === '_id' && ((query._id as any)?.$like === undefined || query._id === undefined)) continue
    const value = (query as any)[key]
    result = findProperty(result, key, value)
    if (result.length === 0) {
      break
    }
  }
  return result
}
