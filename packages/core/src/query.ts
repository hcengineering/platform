import { DocumentQuery } from '.'
import { Class, Doc, Enum, EnumOf, Ref } from './classes'
import core from './component'
import { Hierarchy } from './hierarchy'
import { getObjectValue } from './objvalue'
import { createPredicates, isPredicate } from './predicate'
import { SortingOrder, SortingQuery, Storage } from './storage'

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

function getEnumValue<T extends Doc> (
  key: string,
  _class: Ref<Class<T>>,
  hierarchy: Hierarchy,
  obj: any,
  _enum: Enum
): number {
  const tkey = checkMixinKey(key, _class, hierarchy)
  const value = getObjectValue(tkey, obj)
  const index = _enum.enumValues.findIndex((p) => p === value)
  return index === -1 ? _enum.enumValues.length : index
}

/**
 * @public
 */
export async function resultSort<T extends Doc> (
  result: T[],
  sortOptions: SortingQuery<T>,
  _class: Ref<Class<T>>,
  hierarchy: Hierarchy,
  modelDb: Storage
): Promise<void> {
  const enums = await getEnums(_class, sortOptions, hierarchy, modelDb)
  const sortFunc = (a: any, b: any): number => {
    for (const key in sortOptions) {
      const _enum = enums[key]
      const aValue =
        _enum !== undefined ? getEnumValue(key, _class, hierarchy, a, _enum) : getValue(key, a, _class, hierarchy)
      const bValue =
        _enum !== undefined ? getEnumValue(key, _class, hierarchy, b, _enum) : getValue(key, b, _class, hierarchy)
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

async function getEnums<T extends Doc> (
  _class: Ref<Class<T>>,
  sortOptions: SortingQuery<T>,
  hierarchy: Hierarchy,
  modelDb: Storage
): Promise<Record<string, Enum>> {
  const res: Record<string, Enum> = {}
  for (const key in sortOptions) {
    const attr = hierarchy.findAttribute(_class, key)
    if (attr !== undefined) {
      if (attr !== undefined) {
        if (attr.type._class === core.class.EnumOf) {
          const ref = (attr.type as EnumOf).of
          const enu = await modelDb.findAll(core.class.Enum, { _id: ref })
          res[key] = enu[0]
        }
      }
    }
  }
  return res
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
