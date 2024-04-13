// Check if Symbol is defined
const se = typeof Symbol !== 'undefined'
// Check if Symbol.toStringTag is defined
const ste = se && typeof Symbol.toStringTag !== 'undefined'

/**
 * @function getTypeOf
 * 
 * Returns the type of the given object.
 * 
 * @param {any} obj - The object to check.
 * @returns {string} The type of the object.
 */
export function getTypeOf (obj: any): string {
  const typeofObj = typeof obj
  if (typeofObj !== 'object') {
    return typeofObj
  }
  if (obj === null) {
    return 'null'
  }

  if (Array.isArray(obj) && (!ste || !(Symbol.toStringTag in obj))) {
    return 'Array'
  }

  const stringTag = ste && obj[Symbol.toStringTag]
  if (typeof stringTag === 'string') {
    return stringTag
  }

  const objPrototype = Object.getPrototypeOf(obj)

  if (objPrototype === RegExp.prototype) {
    return 'RegExp'
  }
  if (objPrototype === Date.prototype) {
    return 'Date'
  }

  if (objPrototype === null) {
    return 'Object'
  }
  return {}.toString.call(obj).slice(8, -1)
}

/**
 * @function clone
 * 
 * Clones the given object.
 * 
 * @param {any} obj - The object to clone.
 * @param {(doc: any, m: any) => any} as - A function to transform the cloned object.
 * @param {(value: any) => any | undefined} needAs - A function to check if the transformation is needed.
 * @returns {any} The cloned object.
 */
export function clone (obj: any, as?: (doc: any, m: any) => any, needAs?: (value: any) => any | undefined): any {
  if (typeof obj === 'undefined') {
    return undefined
  }
  if (typeof obj === 'function') {
    return obj
  }
  const typeOf = getTypeOf(obj)
  if (typeOf === 'Date') {
    return new Date(obj.getTime())
  } else if (typeOf === 'Array' || typeOf === 'Object') {
    const isArray = Array.isArray(obj)
    const result: any = isArray ? [] : Object.assign({}, obj)
    for (const key in obj) {
      // include prototype properties
      const value = obj[key]
      const type = getTypeOf(value)
      if (type === 'Array') {
        result[key] = clone(value, as, needAs)
      } else if (type === 'Object') {
        const m = needAs?.(value)
        const valClone = clone(value, as, needAs)
        result[key] = m !== undefined && as !== undefined ? as(valClone, m) : valClone
      } else if (type === 'Date') {
        result[key] = new Date(value.getTime())
      } else {
        if (isArray) {
          result[key] = value
        }
      }
    }
    return result
  } else {
    return obj
  }
}
