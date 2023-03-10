<!--
// Copyright © 2020 Anticrm Platform Contributors.
// 
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { afterUpdate, onDestroy } from 'svelte/internal'

  export let margin: number = 12
  export let show: boolean

  let trigger: HTMLElement
  let popup: HTMLElement
  let scrolling: boolean
  let elScroll: Node

  afterUpdate(() => {
    if (show) showPopup()
    else hidePopup()
  })

  const showPopup = (): void => {
    fitPopup()
    popup.style.visibility = 'visible'
    elScroll = findNode(trigger, 'scrollBox')
    if (elScroll) elScroll.addEventListener('scroll', startScroll)
  }
  const hidePopup = (): void => {
    if (popup) {
      popup.style.visibility = 'hidden'
      popup.style.maxHeight = ''
    }
    if (elScroll) elScroll.removeEventListener('scroll', startScroll)
  }

  const fitPopup = (): void => {
    const rectT = trigger.getBoundingClientRect()
    const rectP = popup.getBoundingClientRect()
    scrolling = false
    if (rectT.top > document.body.clientHeight - rectT.bottom) {
      // Up
      if (rectT.top - 10 - margin < rectP.height) {
        scrolling = true
        popup.style.maxHeight = `${rectT.top - margin - 10}px`
        popup.style.top = '10px'
      } else popup.style.top = `${rectT.top - rectP.height - margin}px`
    } else {
      // Down
      if (rectT.bottom + rectP.height + 10 + margin > document.body.clientHeight) {
        scrolling = true
        popup.style.maxHeight = `${document.body.clientHeight - rectT.bottom - margin - 10}px`
      }
      popup.style.top = `${rectT.bottom + margin}px`
    }
    if (rectT.left + rectP.width + 10 > document.body.clientWidth) {
      popup.style.left = `${document.body.clientWidth - rectP.width - 10}px`
    } else popup.style.left = `${rectT.left}px`
  }

  const findNode = (el: HTMLElement, name: string): any => {
    while (el.parentNode !== null) {
      if (el.classList.contains(name)) return el
      el = el.parentNode as HTMLElement
    }
    return false
  }
  const waitClick = (event: any): void => {
    event.stopPropagation()
    if (show) {
      if (!findNode(event.target, 'popup-menu')) show = false
    }
  }
  const startScroll = (): void => {
    show = false
  }

  onDestroy(() => {
    if (elScroll) elScroll.removeEventListener('scroll', startScroll)
  })
</script>

<svelte:window on:mouseup={waitClick} on:resize={startScroll} />
<div class="popup-menu">
  <div bind:this={trigger}>
    <slot name="trigger" />
  </div>
  <div class="popup" bind:this={popup}>
    {#if show}
      <div class="flex-col" class:scrolling><slot /></div>
    {/if}
  </div>
</div>

<style lang="scss">
  .popup {
    position: fixed;
    visibility: hidden;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    color: var(--caption-color);
    background-color: var(--popup-bg-color);
    border-radius: 0.75rem;
    box-shadow: var(--popup-shadow);
    user-select: none;
    z-index: 10;
  }
  .scrolling {
    overflow-y: auto;
  }
</style>
