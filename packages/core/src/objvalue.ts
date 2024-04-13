import { PlatformError, Severity, Status } from '@hcengineering/platform'
import { Doc } from './classes'
import { clone } from './clone'
import core from './component'

/**
 * @public
 * @function getObjectValue
 * 
 * Retrieves the value of a property from a document using dot notation.
 * 
 * @param {string} key - The key of the property to retrieve, in dot notation.
 * @param {Doc} doc - The document to retrieve the property value from.
 * @returns {any} The value of the property.
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
 * @function setObjectValue
 * 
 * Sets the value of a property in a document using dot notation.
 * 
 * @param {string} key - The key of the property to set, in dot notation.
 * @param {Doc} doc - The document to set the property value in.
 * @param {any} newValue - The new value to set.
 * @returns {void}
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
  value[last] = clone(newValue)
  return value
}

/**
 * @function isNestedArrayQuery
 * 
 * Checks if a value is a nested array query.
 * 
 * @param {any} value - The value to check.
 * @param {string} d - The key to check.
 * @returns {boolean} True if the value is a nested array query, false otherwise.
 */
function isNestedArrayQuery (value: any, d: string): boolean {
  return Number.isNaN(Number.parseInt(d)) && value?.[d as any] === undefined
}

/**
 * @function getNestedArrayValue
 * 
 * Retrieves the nested array value of a property from a document using dot notation.
 * 
 * @param {any[]} value - The array to retrieve the nested value from.
 * @param {string} name - The name of the property to retrieve, in dot notation.
 * @returns {any[]} The nested array value of the property.
 */
function getNestedArrayValue (value: any[], name: string): any[] {
  const result = []
  for (const v of value) {
    result.push(...arrayOrValue(getObjectValue(name, v)))
  }
  return result
}

/**
 * @function arrayOrValue
 * 
 * Checks if a value is an array, and if not, wraps it in an array.
 * 
 * @param {any} vv - The value to check.
 * @returns {any[]} The value, either as it was if it was an array, or wrapped in an array if it was not.
 */
function arrayOrValue (vv: any): any[] {
  return Array.isArray(vv) ? vv : [vv]
}
