import { PlatformError, unknownError } from '@hcengineering/platform'
import { Ref } from '.'
import type { Doc, Mixin } from './classes'

const PROXY_TARGET_KEY = '$___proxy_target'
export const PROXY_MIXIN_CLASS_KEY = '$__mixin'

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

export function freeze (value: any): any {
  if (value != null && typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map((it) => freeze(it))
    }
    if (value instanceof Map) {
      throw new PlatformError(unknownError('Map is not allowed in model'))
    }
    if (value instanceof Set) {
      throw new PlatformError(unknownError('Set is not allowed in model'))
    }
    return new Proxy(value, _createFreezeProxy(value))
  }
  return value
}
/**
 * @internal
 */
export function _createFreezeProxy (doc: Doc): ProxyHandler<Doc> {
  return {
    get (target: any, property: string, receiver: any): any {
      const value = target[property]
      return freeze(value)
    },
    set (target, p, newValue, receiver): any {
      throw new PlatformError(unknownError('Modification is not allowed'))
    },
    defineProperty (target, property, attributes): any {
      throw new PlatformError(unknownError('Modification is not allowed'))
    },

    deleteProperty (target, p): any {
      throw new PlatformError(unknownError('Modification is not allowed'))
    },
    setPrototypeOf (target, v): any {
      throw new PlatformError(unknownError('Modification is not allowed'))
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
