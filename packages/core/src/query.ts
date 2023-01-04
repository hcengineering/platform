import { DocumentQuery } from '.'
import { Class, Doc, Ref } from './classes'
import { Hierarchy } from './hierarchy'
import { getObjectValue } from './objvalue'
import { createPredicates, isPredicate } from './predicate'
import { SortingOrder, SortingQuery } from './storage'

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
    if (val === value || isArrayValueCheck(val, value)) {
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
export function resultSort<T extends Doc> (
  result: T[],
  sortOptions: SortingQuery<T>,
  _class: Ref<Class<T>>,
  hierarchy: Hierarchy
): void {
  const sortFunc = (a: any, b: any): number => {
    for (const key in sortOptions) {
      const aValue = getValue(key, a, _class, hierarchy)
      const bValue = getValue(key, b, _class, hierarchy)
      const result = getSortingResult(aValue, bValue, sortOptions[key])
      if (result !== 0) return result
    }
    return 0
  }
  result.sort(sortFunc)
}

function getSortingResult (aValue: any, bValue: any, order: SortingOrder): number {
  let res = 0
  if (typeof aValue === 'undefined') {
    return typeof bValue === 'undefined' ? 0 : -1
  }
  if (typeof bValue === 'undefined') {
    return 1
  }
  if (Array.isArray(aValue) && Array.isArray(bValue)) {
    res = (aValue.sort((a, b) => (a - b) * order)[0] ?? 0) - (bValue.sort((a, b) => (a - b) * order)[0] ?? 0)
  } else {
    res = typeof aValue === 'string' ? aValue.localeCompare(bValue) : aValue - bValue
  }
  return res * order
}

function getValue<T extends Doc> (key: string, obj: any, _class: Ref<Class<T>>, hierarchy: Hierarchy): any {
  const tkey = checkMixinKey(key, _class, hierarchy)
  let value = getObjectValue(tkey, obj)
  if (typeof value === 'object' && !Array.isArray(value)) {
    value = JSON.stringify(value)
  }
  return value
}
/**
 * @public
 */
export function matchQuery<T extends Doc> (
  docs: Doc[],
  query: DocumentQuery<T>,
  clazz: Ref<Class<T>>,
  hierarchy: Hierarchy,
  skipLookup: boolean = false
): Doc[] {
  let result = [...docs]
  for (const key in query) {
    if (skipLookup && key.startsWith('$lookup.')) {
      continue
    }
    const value = (query as any)[key]
    const tkey = checkMixinKey(key, clazz, hierarchy)
    result = findProperty(result, tkey, value)
    if (result.length === 0) {
      break
    }
  }
  return result
}

/**
 * @public
 */
export function checkMixinKey<T extends Doc> (key: string, clazz: Ref<Class<T>>, hierarchy: Hierarchy): string {
  if (!key.includes('.')) {
    try {
      const attr = hierarchy.findAttribute(clazz, key)
      if (attr !== undefined && hierarchy.isMixin(attr.attributeOf)) {
        // It is mixin
        key = attr.attributeOf + '.' + key
      }
    } catch (err: any) {
      // ignore, if
    }
  }
  return key
}
