<script context="module" lang="ts">
  const observers = new Map()
  const entryMap = new WeakMap<Element, { callback:(entry: IntersectionObserverEntry) => void }>()

  function makeObserver (rootMargin: string): IntersectionObserver {
    return new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          const entryData = entryMap.get(entry.target)
          if (!entryData) {
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

  function listen (rootMargin: string, element: Element, callback: (entry: IntersectionObserverEntry) => void) {
    let observer = observers.get(rootMargin)
    if (!observer) {
      observer = makeObserver(rootMargin)
    }

    entryMap.set(element, { callback })
    observer.observe(element)
    return () => {
      observer.unobserve(element)
      entryMap.delete(element)
    }
  }
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  export let rootMargin = '20%'

  let visible = false
  function observe (node: Element) {
    const lazyEnabled = (localStorage.getItem('#platform.lazy.loading') ?? 'true') === 'true'
    if (!lazyEnabled) {
      dispatch('visible')
      visible = true
    }
    if (visible || typeof window === 'undefined' || !window.IntersectionObserver) {
      // Handle when visible is externally set to true, or InterserctionObserver is not available.
      dispatch('visible')
      visible = true
      return {}
    }

    const destroy = listen(rootMargin, node, ({ isIntersecting }) => {
      visible = isIntersecting
      if (visible) {
        dispatch('visible')
      }
    })

    return {
      destroy
    }
  }
</script>

<div use:observe>
  {#if visible}
    <slot />
  {:else}
    <!-- Zero-width space character -->
    {#if $$slots.loading}
      <slot name="loading" />
    {:else}
      &#8203;
    {/if}
  {/if}
</div>
