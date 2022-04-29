import { Ref } from '.'
import type { Doc, Mixin } from './classes'

const PROXY_TARGET_KEY = '$___proxy_target'
const PROXY_MIXIN_CLASS_KEY = '$__mixin'

/**
 * @internal
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
 */
export function _mixinClass<D extends Doc, M extends D> (doc: D): Ref<Mixin<M>> | undefined {
  return (doc as any)[PROXY_MIXIN_CLASS_KEY]
}
