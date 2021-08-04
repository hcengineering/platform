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
      if (rectT.top - 20 - margin < rectP.height) {
        scrolling = true
        popup.style.maxHeight = `${rectT.top - margin - 20}px`
        popup.style.top = '20px'
      } else popup.style.top = `${rectT.top - rectP.height - margin}px`
    } else {
      // Down
      if (rectT.bottom + rectP.height + 20 + margin > document.body.clientHeight) {
        scrolling = true
        popup.style.maxHeight = `${document.body.clientHeight - rectT.bottom - margin - 20}px`
      }
      popup.style.top = `${rectT.bottom + margin}px`
    }
    if (rectT.left + rectP.width + 20 > document.body.clientWidth) {
      popup.style.left = `${document.body.clientWidth - rectP.width - 20}px`
    } else popup.style.left = `${rectT.left}px`
  }

  const findNode = (el: Node, name: string): any => {
    while (el.parentNode !== null) {
      if (el.classList.contains(name)) return el
      el = el.parentNode
    }
    return false
  }
  const waitClick = (event: any): void => {
    event.stopPropagation()
    if (show) {
      if (!findNode(event.target, 'popup-menu')) show = false
    }
  }
  const startScroll = (): void => { show = false }

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
      <div class="content" class:scrolling><slot /></div>
    {/if}
  </div>
</div>

<style lang="scss">
  .popup {
    position: fixed;
    visibility: hidden;
    display: flex;
    flex-direction: column;
    padding: 16px;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 12px;
    box-shadow: 0px 20px 60px rgba(0, 0, 0, 0.6);
    user-select: none;
    z-index: 10;

    .content {
      display: flex;
      flex-direction: column;

      &.scrolling {
        overflow-y: auto;
      }
    }
  }
</style>
