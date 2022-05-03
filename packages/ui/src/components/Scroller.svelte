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
  import { afterUpdate, onDestroy, onMount } from 'svelte'

  export let padding: boolean = false
  export let autoscroll: boolean = false
  // export let correctPadding: number = 0
  export let bottomStart: boolean = false
  export let tableFade: boolean = false

  let mask: 'top' | 'bottom' | 'both' | 'none' = 'bottom'

  let divScroll: HTMLElement
  let divBox: HTMLElement
  let divBack: HTMLElement
  let divBar: HTMLElement
  let divTrack: HTMLElement
  let isBack: boolean = false // ?
  let isScrolling: boolean = false
  let dY: number
  let belowContent: number | undefined = undefined
  let scrolling: boolean = autoscroll
  let firstScroll: boolean = autoscroll

  const checkBack = (): void => {
    if (divBox) {
      const el = divBox.querySelector('.scroller-back')
      if (el && divScroll) {
        const rectScroll = divScroll.getBoundingClientRect()
        const rectEl = el.getBoundingClientRect()
        const bottom = document.body.clientHeight - rectScroll.bottom
        let top = rectEl.top
        if (top < rectScroll.top) top = rectScroll.top
        if (top > rectScroll.bottom) top = rectScroll.top + rectScroll.height
        divBack.style.left = rectScroll.left + 'px'
        divBack.style.right = document.body.clientWidth - rectScroll.right + 'px'
        divBack.style.top = top + 'px'
        divBack.style.bottom = bottom + 'px'
        divBack.style.height = 'auto'
        divBack.style.width = 'auto'
        divBack.style.visibility = 'visible'
        isBack = true
      } else {
        divBack.style.visibility = 'hidden'
        isBack = false
      }
    }
  }

  const checkBar = (): void => {
    if (divBar && divScroll) {
      const proc = (divScroll.clientHeight / divScroll.scrollHeight) * 100
      const procScroll = (divScroll.clientHeight - 4) / 100
      const procTop = divScroll.scrollTop / divScroll.scrollHeight
      divBar.style.height = procScroll * proc + 'px'
      divBar.style.top = procTop * (divScroll.clientHeight - 4) + 2 + 'px'
      if (mask === 'none') divBar.style.visibility = 'hidden'
      else divBar.style.visibility = 'visible'
      if (divScroll.clientHeight >= divScroll.scrollHeight) divBar.style.visibility = 'hidden'
    }
  }

  const onScroll = (event: MouseEvent): void => {
    if (isScrolling && divBar && divScroll) {
      const rectScroll = divScroll.getBoundingClientRect()
      let Y = event.clientY - dY
      if (Y < rectScroll.top + 2) Y = rectScroll.top + 2
      if (Y > rectScroll.bottom - divBar.clientHeight - 2) Y = rectScroll.bottom - divBar.clientHeight - 2
      divBar.style.top = Y - rectScroll.y + 'px'
      const topBar = Y - rectScroll.y - 2
      const heightScroll = rectScroll.height - 4 - divBar.clientHeight
      const procBar = topBar / heightScroll
      divScroll.scrollTop = (divScroll.scrollHeight - divScroll.clientHeight) * procBar
    }
  }
  const onScrollEnd = (event: MouseEvent): void => {
    const el: HTMLElement = event.currentTarget as HTMLElement
    if (el && isScrolling) {
      document.removeEventListener('mousemove', onScroll)
      document.body.style.userSelect = 'auto'
      document.body.style.webkitUserSelect = 'auto'
    }
    document.removeEventListener('mouseup', onScrollEnd)
    isScrolling = false
  }
  const onScrollStart = (event: MouseEvent): void => {
    const el: HTMLElement = event.currentTarget as HTMLElement
    if (el && divScroll) {
      dY = event.clientY - el.getBoundingClientRect().y
      document.addEventListener('mouseup', onScrollEnd)
      document.addEventListener('mousemove', onScroll)
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
      isScrolling = true
    }
  }

  const checkFade = (): void => {
    if (divScroll) {
      const t = divScroll.scrollTop
      const b = divScroll.scrollHeight - divScroll.clientHeight - t
      if (t > 0 && b > 0) mask = 'both'
      else if (t > 0) mask = 'bottom'
      else if (b > 0) mask = 'top'
      else mask = 'none'
    }
    checkBack()
    if (!isScrolling) checkBar()
    if (scrolling && belowContent && belowContent > 1) {
      divScroll.scrollTop = divScroll.scrollHeight - divScroll.clientHeight
    }
  }

  const observer = new IntersectionObserver(() => checkFade(), { root: null, threshold: 0.1 })

  $: if (autoscroll && !scrolling && belowContent && belowContent < 1 && divScroll) {
    divScroll.scrollTop = divScroll.scrollHeight - divScroll.clientHeight
    scrolling = true
  }
  $: if (scrolling && divScroll && divScroll.scrollHeight - divScroll.scrollTop - divScroll.clientHeight < 5) { divScroll.scrollTop = divScroll.scrollHeight - divScroll.clientHeight }

  onMount(() => {
    if (divScroll && divBox) {
      divScroll.addEventListener('scroll', checkFade)
      const tempEl = divBox.querySelector('*') as HTMLElement
      if (tempEl) observer.observe(tempEl)
      checkFade()
    }
    if (divBack) checkBack()
  })
  onDestroy(() => {
    if (divScroll) divScroll.removeEventListener('scroll', checkFade)
  })
  afterUpdate(() => {
    if (divScroll && divBox) {
      const tempEl = divBox.querySelector('*') as HTMLElement
      if (tempEl) observer.observe(tempEl)
      if (scrolling) divScroll.scrollTop = divScroll.scrollHeight - divScroll.clientHeight
      belowContent = divScroll.scrollHeight - divScroll.clientHeight - divScroll.scrollTop
      checkFade()
    }
  })

  let divWidth: number = 0
  const _resize = (): void => {
    checkFade()
  }
  $: if (divWidth) _resize()

  const _scroll = (ev: Event): void => {
    if (ev.type === 'scroll') {
      firstScroll ? (firstScroll = false) : (scrolling = false)
      if (ev.target) {
        const el: HTMLElement = ev.target as HTMLElement
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 5) scrolling = true
      }
    }
  }
</script>

<svelte:window on:resize={_resize} />
<div class="scroller-container" class:bottomStart>
  <div
    bind:this={divScroll}
    bind:clientWidth={divWidth}
    on:scroll={_scroll}
    class="scroll relative"
    class:tableFade
    class:antiNav-topFade={mask === 'top'}
    class:antiNav-bottomFade={mask === 'bottom'}
    class:antiNav-bothFade={mask === 'both'}
    class:antiNav-noneFade={mask === 'none'}
  >
    <div bind:this={divBox} class="box" class:p-10={padding}>
      <slot />
    </div>
  </div>
  <div bind:this={divBack} class="back" />
  <div class="bar" class:hovered={isScrolling} bind:this={divBar} on:mousedown={onScrollStart} />
  <div class="track" class:hovered={isScrolling} bind:this={divTrack} />
</div>

<style lang="scss">
  .scroller-container {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .scroll {
    flex-grow: 1;
    min-height: 0;
    height: max-content;
    overflow-x: hidden;
    overflow-y: auto;

    &::-webkit-scrollbar:vertical {
      width: 0;
    }
  }
  .box {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .scroller-container.bottomStart {
    justify-content: flex-end;
    .scroll {
      flex-grow: 0;
      height: min-content;
      .box {
        height: min-content;
      }
    }
  }

  .track {
    visibility: hidden;
    position: absolute;
    top: 2px;
    bottom: 2px;
    right: 2px;
    width: 8px;
    transform-origin: center;
    transform: scaleX(0);
    transition: all 0.1s ease-in-out;
    background-color: var(--theme-menu-color);
    border-radius: 0.5rem;
  }
  .bar {
    visibility: hidden;
    position: absolute;
    top: 2px;
    right: 2px;
    width: 8px;
    min-height: 2rem;
    max-height: calc(100% - 12px);
    transform-origin: center;
    transform: scaleX(0.5);
    background-color: var(--theme-button-bg-focused);
    border-radius: 0.125rem;
    opacity: 0.5;
    cursor: pointer;
    z-index: 1;
    transition: all 0.1s;

    &:hover,
    &.hovered {
      background-color: var(--theme-button-bg-hovered);
      transform: scaleX(1);
      border-radius: 0.25rem;
      opacity: 1;
      filter: drop-shadow(0 0 1px black);

      & + .track {
        visibility: visible;
        right: 2px;
        transform: scaleX(1);
      }
    }
    &.hovered {
      transition: none;
    }
  }

  .back {
    visibility: hidden;
    position: fixed;
    width: 0;
    height: 0;
    // background-color: red;
    background-color: var(--body-color);
    z-index: -1;
  }
</style>
