<script lang="ts">
  import { onMount } from 'svelte'

  interface PopupPosition {
    top: number
    left: number
  }

  const OFFSET = 10 // Spacing between popup and trigger/viewport edges

  let showPopup = false
  let triggerElement: HTMLElement | null = null
  let popupElement: HTMLElement | null = null

  export let hoverDelay = 200
  export let leaveDelay = 200
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined
  let leaveTimeout: ReturnType<typeof setTimeout> | undefined

  let popupPosition: PopupPosition = { top: 0, left: 0 }

  function onMouseEnter (): void {
    if (leaveTimeout !== undefined) {
      clearTimeout(leaveTimeout)
    }
    hoverTimeout = setTimeout(() => {
      showPopup = true
    }, hoverDelay)
  }

  function onMouseLeave (): void {
    if (hoverTimeout !== undefined) {
      clearTimeout(hoverTimeout)
    }
    leaveTimeout = setTimeout(() => {
      showPopup = false
    }, leaveDelay)
  }

  function updatePopupPosition (): void {
    if (triggerElement === null || popupElement === null) return

    const triggerRect = triggerElement.getBoundingClientRect()
    const popupRect = popupElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const position: PopupPosition = {
      top: triggerRect.bottom + OFFSET,
      left: triggerRect.left
    }

    // Adjust vertical position if popup would go below viewport
    if (position.top + popupRect.height > viewportHeight) {
      position.top = triggerRect.top - popupRect.height - OFFSET
    }

    // Adjust horizontal position if popup would go beyond right edge
    if (position.left + popupRect.width > viewportWidth) {
      position.left = viewportWidth - popupRect.width - OFFSET
    }

    // Ensure popup doesn't go beyond left edge
    position.left = Math.max(OFFSET, position.left)

    popupPosition = position
  }

  $: if (showPopup) {
    setTimeout(updatePopupPosition, 0)
  }

  onMount(() => {
    if (triggerElement === null) {
      throw new Error('Trigger element not found')
    }

    triggerElement.addEventListener('mouseenter', onMouseEnter)
    triggerElement.addEventListener('mouseleave', onMouseLeave)

    window.addEventListener('resize', updatePopupPosition)

    return () => {
      if (triggerElement !== null) {
        triggerElement.removeEventListener('mouseenter', onMouseEnter)
        triggerElement.removeEventListener('mouseleave', onMouseLeave)
      }
      if (hoverTimeout !== undefined) clearTimeout(hoverTimeout)
      if (leaveTimeout !== undefined) clearTimeout(leaveTimeout)
      window.removeEventListener('resize', updatePopupPosition)
    }
  })
</script>

<div bind:this={triggerElement} class="trigger">
  <slot name="trigger" />
</div>

{#if showPopup}
  <div
    bind:this={popupElement}
    class="popup-container"
    on:mouseenter={() => { if (leaveTimeout !== undefined) clearTimeout(leaveTimeout) }}
    on:mouseleave={onMouseLeave}
    style="top: {popupPosition.top}px; left: {popupPosition.left}px"
    role="dialog" aria-hidden={!showPopup}
  >
    <slot name="popup" />
  </div>
{/if}

<style>
  .trigger {
    display: inline-block;
  }

  .popup-container {
    position: fixed;
    z-index: 1000;
  }
</style>
