import { Ref } from '.'
import type { Doc, Mixin } from './classes'

const PROXY_TARGET_KEY = '$___proxy_target'
const PROXY_MIXIN_CLASS_KEY = '$__mixin'

/**
 * @internal
 * @function _createMixinProxy
 * 
 * This function creates a proxy for a mixin.
 * 
 * @param {Mixin<Doc>} mixin - The mixin to create a proxy for.
 * @param {ProxyHandler<Doc> | null} ancestorProxy - The ancestor proxy.
 * @returns {ProxyHandler<Doc>} The created proxy.
 */
export function _createMixinProxy (mixin: Mixin<Doc>, ancestorProxy: ProxyHandler<Doc> | null): ProxyHandler<Doc> {
  return {
    get (target: any, property: string, receiver: any): any {
      if (property === PROXY_TARGET_KEY) {
        return target
      }
      // We need to override _class property, to return proper mixin class.
      if (property === PROXY_MIXIN_CLASS_KEY) {
        return mixin._id
      }
      const value = target[mixin._id]?.[property]
      if (value === undefined) {
        return ancestorProxy !== null ? ancestorProxy.get?.(target, property, receiver) : target[property]
      }
      return value
    }
  }
}

/**
 * @internal
 * @function _toDoc
 * 
 * This function converts a document to its target document if it is a proxy.
 * 
 * @template D extends Doc - The type of the document.
 * @param {D} doc - The document to convert.
 * @returns {D} The target document if the document is a proxy, otherwise the original document.
 */
export function _toDoc<D extends Doc> (doc: D): D {
  const targetDoc = (doc as any)[PROXY_TARGET_KEY]
  if (targetDoc !== undefined) {
    return targetDoc as D
  }
  return doc
}

/**
 * @internal
 * @function _mixinClass
 * 
 * This function gets the mixin class of a document.
 * 
 * @template D extends Doc - The type of the document.
 * @template M extends D - The type of the mixin.
 * @param {D} doc - The document to get the mixin class from.
 * @returns {Ref<Mixin<M>> | undefined} The mixin class if it exists, otherwise undefined.
 */
export function _mixinClass<D extends Doc, M extends D> (doc: D): Ref<Mixin<M>> | undefined {
  return (doc as any)[PROXY_MIXIN_CLASS_KEY]
}
