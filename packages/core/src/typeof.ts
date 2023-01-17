const se = typeof Symbol !== 'undefined'
const ste = se && typeof Symbol.toStringTag !== 'undefined'

export default function getTypeOf (obj: any): string {
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
