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
  import { onDestroy, onMount } from 'svelte'
  import { resizeObserver } from '../resize'
  import { themeStore as themeOptions } from '@anticrm/theme'
  import type { FadeOptions } from '../types'
  import { defaultSP } from '../types'

  export let padding: string | undefined = undefined
  export let autoscroll: boolean = false
  // export let correctPadding: number = 0
  export let bottomStart: boolean = false
  export let fade: FadeOptions = defaultSP
  // export let verticalFade: boolean = false
  export let invertScroll: boolean = false

  let mask: 'top' | 'bottom' | 'both' | 'none' = 'none'

  let divScroll: HTMLElement
  let divBox: HTMLElement
  let divBar: HTMLElement
  let divTrack: HTMLElement
  let isScrolling: boolean = false
  let dY: number
  let belowContent: number | undefined = undefined
  let beforeContent: number | undefined = undefined
  let scrolling: boolean = autoscroll
  let firstScroll: boolean = autoscroll

  let timer: number

  $: shiftTop = fade.offset?.top
      ? (fade.multipler?.top ?? 0) * $themeOptions.fontSize
      : 0
  $: shiftBottom = fade.offset?.bottom
      ? fade.multipler?.bottom! * $themeOptions.fontSize
      : 0

  const checkBar = (): void => {
    if (divBar && divScroll) {
      const trackH = divScroll.clientHeight - shiftTop - shiftBottom - 4
      const scrollH = divScroll.scrollHeight
      const proc = scrollH / trackH
      divBar.style.height = divScroll.clientHeight / proc + 'px'
      divBar.style.top = divScroll.scrollTop / proc + shiftTop + shiftBottom + 2 + 'px'
      if (mask === 'none') divBar.style.visibility = 'hidden'
      else {
        divBar.style.visibility = 'visible'
        if (divBar) {
          if (timer) {
            clearTimeout(timer)
            divBar.style.opacity = '1'
          }
          timer = setTimeout(() => {
            if (divBar) divBar.style.opacity = '0'
          }, 1500)
        }
      }
      if (divScroll.clientHeight >= divScroll.scrollHeight) divBar.style.visibility = 'hidden'
    }
  }

  const onScroll = (event: MouseEvent): void => {
    scrolling = false
    if (isScrolling && divBar && divScroll) {
      const rectScroll = divScroll.getBoundingClientRect()
      let Y = event.clientY - dY
      if (Y < rectScroll.top + shiftTop + 2)
        Y = rectScroll.top + shiftTop + 2
      if (Y > rectScroll.bottom - divBar.clientHeight - shiftBottom - 2)
        Y = rectScroll.bottom - divBar.clientHeight - shiftBottom - 2
      divBar.style.top = Y - rectScroll.y + 'px'
      const topBar = Y - rectScroll.y - shiftTop - 2
      const heightScroll = rectScroll.height - 4 - divBar.clientHeight - shiftTop - shiftBottom
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
    scrolling = false
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
      beforeContent = divScroll.scrollTop
      belowContent = divScroll.scrollHeight - divScroll.clientHeight - beforeContent
      if (beforeContent > 2 && belowContent > 2) mask = 'both'
      else if (beforeContent > 2) mask = 'bottom'
      else if (belowContent > 2) mask = 'top'
      else mask = 'none'

      if (autoscroll) {
        if (scrolling && divScroll.scrollHeight - divScroll.clientHeight - divScroll.scrollTop > 10 && !firstScroll) {
          scrolling = false
        }
        if (!scrolling && belowContent && belowContent <= 10) scrolling = true
      }
    }
    if (!isScrolling) checkBar()
  }

  const scrollDown = (): void => {
    divScroll.scrollTop = divScroll.scrollHeight - divHeight
  }
  $: if (scrolling && belowContent && belowContent > 10) scrollDown()
  onMount(() => {
    if (divScroll && divBox) {
      divScroll.addEventListener('scroll', checkFade)
      const observer = new IntersectionObserver(() => checkFade(), { root: null, threshold: 0.1 })
      const tempEl = divBox.querySelector('*') as HTMLElement
      if (tempEl) observer.observe(tempEl)
      if (autoscroll && scrolling) {
        scrollDown()
        firstScroll = false
      }
      checkBar()
    }
  })
  onDestroy(() => {
    if (divScroll) divScroll.removeEventListener('scroll', checkFade)
  })

  let divHeight: number
  const _resize = (): void => checkFade()

  let boxHeight: number
  $: if (boxHeight) checkFade()

  $: scrollerVars = `
    --scroller-header-height: ${(fade.multipler && fade.multipler.top ? fade.multipler.top : 0) * $themeOptions.fontSize}px;
    --scroller-footer-height: ${(fade.multipler && fade.multipler.bottom ? fade.multipler.bottom : 0) * $themeOptions.fontSize}px;
    --scroller-header-fade: ${mask === 'none' || mask === 'top' ? '0px' : '2rem'};
    --scroller-footer-fade: ${mask === 'none' || mask === 'bottom' ? '0px' : '2rem'};
  `
</script>

<svelte:window on:resize={_resize} />

<div
  class="scroller-container {invertScroll ? 'invert' : 'normal'}"
  class:bottomStart
  style={scrollerVars}
>
  <div
    bind:this={divScroll}
    use:resizeObserver={(element) => {
      divHeight = element.clientHeight
    }}
    class="scroll relative verticalFade"
  >
    <div
      bind:this={divBox}
      class="box"
      style:padding
      use:resizeObserver={(element) => {
        boxHeight = element.clientHeight
      }}
      on:dragover
      on:drop
    >
      <slot />
    </div>
  </div>
  <div
    class="bar"
    class:hovered={isScrolling}
    bind:this={divBar}
    on:mousedown={onScrollStart}
    on:mouseleave={checkFade}
  />
  <div class="track" class:hovered={isScrolling} class:fadeTopOffset={fade.offset?.top} class:fadeBottomOffset={fade.offset?.bottom} bind:this={divTrack} />
</div>

<style lang="scss">
  .scroller-container {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    min-height: 0;

    &.normal .track,
    &.normal .bar { right: 2px; }
    &.invert .track,
    &.invert .bar { left: 2px; }
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
    &.verticalFade {
      mask-image:
        linear-gradient(0deg,
        rgba(0, 0, 0, 1) calc(var(--scroller-footer-height, 2.5rem)),
        rgba(0, 0, 0, 0) calc(var(--scroller-footer-height, 2.5rem)),
        rgba(0, 0, 0, 1) calc(var(--scroller-footer-height, 2.5rem) + var(--scroller-footer-fade, 0) + 1px),
        rgba(0, 0, 0, 1) calc(100% - var(--scroller-header-height, 0) - var(--scroller-header-fade, 0) - 1px),
        rgba(0, 0, 0, 0) calc(100% - var(--scroller-header-height, 0)),
        rgba(0, 0, 0, 1) calc(100% - var(--scroller-header-height, 0))
      );
    }
  }
  .box {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
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
    width: 8px;
    transform-origin: center;
    transform: scaleX(0);
    transition: all 0.1s ease-in-out;
    background-color: var(--scrollbar-track-color);
    border-radius: 0.5rem;

    &.fadeTopOffset { top: var(--scroller-header-height); }
    &.fadeBottomOffset { top: var(--scroller-footer-height); }
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
    background-color: var(--scrollbar-bar-color);
    border-radius: 0.125rem;
    opacity: 0;
    box-shadow: 0 0 1px 1px var(--board-bg-color);
    cursor: pointer;
    z-index: 1;
    transition: all 0.15s;

    &:hover,
    &.hovered {
      background-color: var(--scrollbar-bar-hover);
      transform: scaleX(1);
      border-radius: 0.25rem;
      opacity: 1 !important;
      box-shadow: 0 0 1px black;

      & + .track {
        visibility: visible;
        transform: scaleX(1);
      }
    }
    &.hovered {
      transition: none;
    }
  }
</style>
