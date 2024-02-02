import { DelayedCaller } from './utils'

const observers = new Map<string, IntersectionObserver>()
const entryMap = new WeakMap<Element, { callback: (isIntersecting: boolean) => void }>()

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
      if (entry.isIntersecting) {
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

function listen (rootMargin: string, element: Element, callback: (isIntersecting: boolean) => void): () => void {
  let observer = observers.get(rootMargin)
  if (observer == null) {
    observer = makeObserver(rootMargin)
    observers.set(rootMargin, observer)
  }

  entryMap.set(element, { callback })
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

export function lazyObserver (node: Element, onVisible: (value: boolean, unsubscribe?: () => void) => void): any {
  let visible = false
  const lazyEnabled = isLazyEnabled()
  if (!lazyEnabled) {
    visible = true
    onVisible(visible)
  }
  if (visible) {
    onVisible(visible)
    return {}
  }

  let needsUpdate = true
  let destroy = (): void => {}
  // we need this update function to re-trigger observer for moved elements
  // moved elements are relevant because onVisible can have side effects
  const update = (): void => {
    if (!needsUpdate) {
      return
    }
    needsUpdate = false
    destroy()
    destroy = listen('20%', node, (isIntersecting) => {
      visible = isIntersecting
      needsUpdate = visible
      onVisible(visible, destroy)
    })
  }
  update()

  return {
    destroy,
    update
  }
}
