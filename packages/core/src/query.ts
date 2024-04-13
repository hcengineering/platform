import { DocumentQuery } from '.'
import { Class, Doc, Enum, EnumOf, Ref } from './classes'
import core from './component'
import { Hierarchy } from './hierarchy'
import { getObjectValue } from './objvalue'
import { createPredicates, isPredicate } from './predicate'
import { SortQuerySelector, SortingOrder, SortingQuery, SortingRules, Storage } from './storage'

/**
 * @public
 * @function findProperty
 * 
 * Finds a property in a list of objects.
 * 
 * @param {Doc[]} objects - The list of objects to search.
 * @param {string} propertyKey - The key of the property to find.
 * @param {any} value - The value of the property to find.
 * @returns {Doc[]} The list of objects that have the property with the specified value.
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
    if (val === value || (val == null && value == null) || isArrayValueCheck(val, value)) {
      result.push(object)
    }
  }
  return result
}

/**
 * @function isArrayValueCheck
 * 
 * Checks if a value is an array and if it includes a specified value.
 * 
 * @template T - The type of the array.
 * @template P - The type of the value to check.
 * @param {T} val - The array to check.
 * @param {P} value - The value to check for.
 * @returns {boolean} True if the value is an array and includes the specified value, false otherwise.
 */
function isArrayValueCheck<T, P> (val: T, value: P): boolean {
  return Array.isArray(val) && !Array.isArray(value) && val.includes(value)
}

/**
 * @function getEnumValue
 * 
 * Gets the value of an enumeration.
 * 
 * @template T extends Doc - The type of the document.
 * @param {string} key - The key of the enumeration.
 * @param {Ref<Class<T>>} _class - The class of the document.
 * @param {Hierarchy} hierarchy - The hierarchy of the document.
 * @param {any} obj - The object to get the enumeration value from.
 * @param {Enum} _enum - The enumeration to get the value from.
 * @returns {number} The value of the enumeration.
 */
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
 * @function resultSort
 * 
 * Sorts a list of results based on specified sorting options.
 * 
 * @param {T[]} result - The list of results to sort.
 * @param {SortingQuery<T>} sortOptions - The sorting options to use.
 * @param {Ref<Class<T>>} _class - The class of the objects in the result list.
 * @param {Hierarchy} hierarchy - The hierarchy of the objects in the result list.
 * @param {Storage} modelDb - The storage where the objects are stored.
 * @returns {Promise<void>} A promise that resolves when the sorting is complete.
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

/**
 * @function mapSortingValue
 * 
 * Maps a sorting value based on sorting rules.
 * 
 * @param {SortingOrder | SortingRules} order - The sorting order or rules.
 * @param {any} val - The value to map.
 * @returns {any} The mapped value.
 */
function mapSortingValue (order: SortingOrder | SortingRules<any>, val: any): any {
  if (typeof order !== 'object') {
    return val
  }
  for (const r of order.cases) {
    if (typeof r.query === 'object') {
      const q: SortQuerySelector<any> = r.query
      if (q.$in?.includes(val) ?? false) {
        return r.index
      }
      if (q.$nin !== undefined && !q.$nin.includes(val)) {
        return r.index
      }
      if (q.$ne !== undefined && q.$ne !== val) {
        return r.index
      }
    }
    if (r.query === val) {
      return r.index
    }
  }
}

/**
 * @function getSortingResult
 * 
 * Gets the sorting result of two values based on a sorting order or rules.
 * 
 * @param {any} aValue - The first value to compare.
 * @param {any} bValue - The second value to compare.
 * @param {SortingOrder | SortingRules} order - The sorting order or rules.
 * @returns {number} The sorting result.
 */
function getSortingResult (aValue: any, bValue: any, order: SortingOrder | SortingRules<any>): number {
  let res = 0
  if (typeof aValue === 'undefined') {
    return typeof bValue === 'undefined' ? 0 : -1
  }
  if (typeof bValue === 'undefined') {
    return 1
  }

  const orderOrder = typeof order === 'object' ? order.order : order

  if (Array.isArray(aValue) && Array.isArray(bValue)) {
    res =
      (aValue.map((it) => mapSortingValue(order, it)).sort((a, b) => (a - b) * orderOrder)[0] ?? 0) -
      (bValue.map((it) => mapSortingValue(order, it)).sort((a, b) => (a - b) * orderOrder)[0] ?? 0)
  } else {
    const aaValue = mapSortingValue(order, aValue)
    const bbValue = mapSortingValue(order, bValue)
    res = typeof aaValue === 'string' ? aaValue.localeCompare(bbValue) : aaValue - bbValue
  }
  return res * orderOrder
}

/**
 * @function getEnums
 * 
 * Gets the enumerations of a class based on sorting options.
 * 
 * @param {Ref<Class>} _class - The class to get the enumerations from.
 * @param {SortingQuery} sortOptions - The sorting options.
 * @param {Hierarchy} hierarchy - The hierarchy of the class.
 * @param {Storage} modelDb - The storage where the class is stored.
 * @returns {Promise<Record<string, Enum>>} A promise that resolves to a record of enumerations.
 */
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

/**
 * @function getValue
 * 
 * Gets the value of a key from an object.
 * 
 * @param {string} key - The key to get the value from.
 * @param {any} obj - The object to get the value from.
 * @param {Ref<Class>} _class - The class of the object.
 * @param {Hierarchy} hierarchy - The hierarchy of the object.
 * @returns {any} The value of the key in the object.
 */
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
 * @function matchQuery
 * 
 * Matches a query against a list of documents.
 * 
 * @param {Doc[]} docs - The list of documents to match against.
 * @param {DocumentQuery} query - The query to match.
 * @param {Ref<Class>} clazz - The class of the documents.
 * @param {Hierarchy} hierarchy - The hierarchy of the documents.
 * @param {boolean} skipLookup - Whether to skip lookup in the query.
 * @returns {Doc[]} The list of documents that match the query.
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
 * @function checkMixinKey
 * 
 * Checks if a key is a mixin and returns the key with the mixin prefix if it is.
 * 
 * @param {string} key - The key to check.
 * @param {Ref<Class>} clazz - The class of the object that the key belongs to.
 * @param {Hierarchy} hierarchy - The hierarchy of the object.
 * @returns {string} The key with the mixin prefix if it is a mixin, otherwise the original key.
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
