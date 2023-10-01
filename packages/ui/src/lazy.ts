const observers = new Map<string, IntersectionObserver>()
const entryMap = new WeakMap<Element, { callback: (entry: IntersectionObserverEntry) => void }>()

function makeObserver (rootMargin: string): IntersectionObserver {
  return new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        const entryData = entryMap.get(entry.target)
        if (entryData == null) {
          observer.unobserve(entry.target)
          continue
        }

        entryData.callback(entry)
        if (entry.isIntersecting) {
          entryMap.delete(entry.target)
          observer.unobserve(entry.target)
        }
      }
    },
    { rootMargin }
  )
}

function listen (
  rootMargin: string,
  element: Element,
  callback: (entry: IntersectionObserverEntry) => void
): () => void {
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

export function lazyObserver (node: Element, onVisible: (value: boolean) => void): any {
  let visible = false
  const lazyEnabled = (localStorage.getItem('#platform.lazy.loading') ?? 'true') === 'true'
  if (!lazyEnabled) {
    visible = true
    onVisible(visible)
  }
  if (visible) {
    onVisible(visible)
    return {}
  }

  const destroy = listen('20%', node, ({ isIntersecting }) => {
    visible = isIntersecting
    onVisible(visible)
  })

  return {
    destroy
  }
}
