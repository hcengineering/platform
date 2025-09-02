import { DelayedCaller } from './utils'

type ObserverMode = 'once' | 'continuous'

interface ObserverEntry {
  callback: (isIntersecting: boolean) => void
  mode: ObserverMode
}

const observers = new Map<string, IntersectionObserver>()
const entryMap = new WeakMap<Element, ObserverEntry>()

const delayedCaller = new DelayedCaller(5)

function makeObserver (rootMargin: string): IntersectionObserver {
  const entriesPending = new Map<Element, { isIntersecting: boolean }>()

  const notifyObservers = (observer: IntersectionObserver): void => {
    for (const [target, entry] of entriesPending.entries()) {
      const entryData = entryMap.get(target)
      if (entryData == null) {
        observer.unobserve(target)
        continue
      }

      entryData.callback(entry.isIntersecting)

      // Only unobserve if mode is 'once' and element became visible
      if (entry.isIntersecting && entryData.mode === 'once') {
        entryMap.delete(target)
        observer.unobserve(target)
      }
    }
    entriesPending.clear()
  }

  const observer = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        entriesPending.set(entry.target, { isIntersecting: entry.isIntersecting })
      }
      delayedCaller.call(() => {
        notifyObservers(observer)
      })
    },
    { rootMargin }
  )
  return observer
}

function listen (
  rootMargin: string,
  element: Element,
  callback: (isIntersecting: boolean) => void,
  mode: ObserverMode = 'once'
): () => void {
  let observer = observers.get(rootMargin)
  if (observer == null) {
    observer = makeObserver(rootMargin)
    observers.set(rootMargin, observer)
  }

  entryMap.set(element, { callback, mode })
  observer.observe(element)

  return () => {
    observer?.unobserve(element)
    entryMap.delete(element)
  }
}

/**
 * @public
 */
export const isLazyEnabled = (): boolean => (localStorage.getItem('#platform.lazy.loading') ?? 'true') === 'true'

interface LazyObserverOptions {
  mode?: ObserverMode
  rootMargin?: string
}

export function lazyObserver (
  node: Element,
  onVisible: (value: boolean, unsubscribe?: () => void) => void,
  options: LazyObserverOptions = {}
): any {
  const { mode = 'once', rootMargin = '20%' } = options

  let visible = false
  let destroy = (): void => {}

  const lazyEnabled = isLazyEnabled()

  // Special case: 'once' mode with lazy disabled - immediately report visible
  if (!lazyEnabled && mode === 'once') {
    visible = true
    onVisible(visible)
    return {
      destroy: () => {},
      update: () => {}
    }
  }

  // For continuous mode, we set up once and don't need the update logic
  if (mode === 'continuous') {
    destroy = listen(
      rootMargin,
      node,
      (isIntersecting) => {
        if (visible !== isIntersecting) {
          visible = isIntersecting
          onVisible(visible, destroy)
        }
      },
      mode
    )

    return {
      destroy,
      update: () => {} // No-op for continuous mode
    }
  }

  // For 'once' mode with lazy enabled
  let needsUpdate = true

  const update = (): void => {
    if (!needsUpdate) {
      return
    }
    needsUpdate = false
    destroy()

    destroy = listen(
      rootMargin,
      node,
      (isIntersecting) => {
        visible = isIntersecting
        needsUpdate = visible
        onVisible(visible, destroy)
      },
      mode
    )
  }
  update()

  return {
    destroy,
    update
  }
}

export function lazyObserverOnce (
  node: Element,
  onVisible: (value: boolean, unsubscribe?: () => void) => void,
  rootMargin = '20%'
): any {
  return lazyObserver(node, onVisible, { mode: 'once', rootMargin })
}

export function lazyObserverContinuous (
  node: Element,
  onVisible: (value: boolean, unsubscribe?: () => void) => void,
  rootMargin = '20%'
): any {
  return lazyObserver(node, onVisible, { mode: 'continuous', rootMargin })
}
