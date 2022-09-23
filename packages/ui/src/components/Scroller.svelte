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
  import { themeStore as themeOptions } from '@hcengineering/theme'
  import type { FadeOptions } from '../types'
  import { defaultSP } from '../types'
  import { closeTooltip, tooltipstore } from '../tooltips'

  export let padding: string | undefined = undefined
  export let autoscroll: boolean = false
  export let bottomStart: boolean = false
  export let fade: FadeOptions = defaultSP
  export let invertScroll: boolean = false
  export let horizontal: boolean = false
  export let contentDirection: 'vertical' | 'horizontal' = 'vertical'

  let mask: 'top' | 'bottom' | 'both' | 'none' = 'none'
  let maskH: 'left' | 'right' | 'both' | 'none' = 'none'

  let divScroll: HTMLElement
  let divBox: HTMLElement
  let divBar: HTMLElement
  let divBarH: HTMLElement
  let isScrolling: 'vertical' | 'horizontal' | false = false
  let dXY: number
  let belowContent: number | undefined = undefined
  let beforeContent: number | undefined = undefined
  let leftContent: number | undefined = undefined
  let rightContent: number | undefined = undefined
  let scrolling: boolean = autoscroll
  let firstScroll: boolean = autoscroll

  let timer: number
  let timerH: number

  $: shiftTop = fade.offset?.top ? (fade.multipler?.top ?? 0) * $themeOptions.fontSize : 0
  $: shiftBottom = fade.offset?.bottom ? fade.multipler?.bottom! * $themeOptions.fontSize : 0

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
  const checkBarH = (): void => {
    if (divBarH && divScroll) {
      const trackW = divScroll.clientWidth - (mask !== 'none' ? 14 : 4)
      const scrollW = divScroll.scrollWidth
      const proc = scrollW / trackW
      divBarH.style.width = divScroll.clientWidth / proc + 'px'
      divBarH.style.left = divScroll.scrollLeft / proc + 2 + 'px'
      if (maskH === 'none') divBarH.style.visibility = 'hidden'
      else {
        divBarH.style.visibility = 'visible'
        if (divBarH) {
          if (timerH) {
            clearTimeout(timerH)
            divBarH.style.opacity = '1'
          }
          timerH = setTimeout(() => {
            if (divBarH) divBarH.style.opacity = '0'
          }, 1500)
        }
      }
      if (divScroll.clientWidth >= divScroll.scrollWidth) divBarH.style.visibility = 'hidden'
    }
  }

  const onScroll = (event: MouseEvent): void => {
    scrolling = false
    if (isScrolling && divBar && divScroll) {
      const rectScroll = divScroll.getBoundingClientRect()
      if (isScrolling === 'vertical') {
        let Y = event.clientY - dXY
        if (Y < rectScroll.top + shiftTop + 2) Y = rectScroll.top + shiftTop + 2
        if (Y > rectScroll.bottom - divBar.clientHeight - shiftBottom - 2) {
          Y = rectScroll.bottom - divBar.clientHeight - shiftBottom - 2
        }
        divBar.style.top = Y - rectScroll.y + 'px'
        const topBar = Y - rectScroll.y - shiftTop - 2
        const heightScroll = rectScroll.height - 4 - divBar.clientHeight - shiftTop - shiftBottom
        const procBar = topBar / heightScroll
        divScroll.scrollTop = (divScroll.scrollHeight - divScroll.clientHeight) * procBar
      } else {
        let X = event.clientX - dXY
        if (X < rectScroll.left + 2) X = rectScroll.left + 2
        if (X > rectScroll.right - divBarH.clientWidth - (mask !== 'none' ? 12 : 2)) {
          X = rectScroll.right - divBarH.clientWidth - (mask !== 'none' ? 12 : 2)
        }
        divBarH.style.left = X - rectScroll.x + 'px'
        const topBar = X - rectScroll.x - (mask !== 'none' ? 12 : 2)
        const widthScroll = rectScroll.width - 2 - divBarH.clientWidth - (mask !== 'none' ? 12 : 2)
        const procBar = topBar / widthScroll
        divScroll.scrollLeft = (divScroll.scrollWidth - divScroll.clientWidth) * procBar
      }
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
  const onScrollStart = (event: MouseEvent, direction: 'vertical' | 'horizontal'): void => {
    scrolling = false
    const el: HTMLElement = event.currentTarget as HTMLElement
    if (el && divScroll) {
      dXY =
        direction === 'vertical'
          ? event.clientY - el.getBoundingClientRect().y
          : event.clientX - el.getBoundingClientRect().x
      document.addEventListener('mouseup', onScrollEnd)
      document.addEventListener('mousemove', onScroll)
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
      isScrolling = direction
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

      if (horizontal) {
        leftContent = divScroll.scrollLeft
        rightContent = divScroll.scrollWidth - divScroll.clientWidth - leftContent
        if (leftContent > 2 && rightContent > 2) maskH = 'both'
        else if (leftContent > 2) maskH = 'right'
        else if (rightContent > 2) maskH = 'left'
        else maskH = 'none'
      }

      if (autoscroll) {
        if (scrolling && divScroll.scrollHeight - divScroll.clientHeight - divScroll.scrollTop > 10 && !firstScroll) {
          scrolling = false
        }
        if (!scrolling && belowContent && belowContent <= 10) scrolling = true
      }
    }
    if (!isScrolling) checkBar()
    if (!isScrolling && horizontal) checkBarH()
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
      if (horizontal) checkBarH()
    }
  })
  onDestroy(() => {
    if (divScroll) divScroll.removeEventListener('scroll', checkFade)
  })

  let divHeight: number
  const _resize = (): void => checkFade()

  let boxHeight: number
  $: if (boxHeight) checkFade()
  let boxWidth: number
  $: if (boxWidth) checkFade()

  $: scrollerVars = `
    --scroller-header-height: ${
      (fade.multipler && fade.multipler.top ? fade.multipler.top : 0) * $themeOptions.fontSize
    }px;
    --scroller-footer-height: ${
      (fade.multipler && fade.multipler.bottom ? fade.multipler.bottom : 0) * $themeOptions.fontSize
    }px;
    --scroller-header-fade: ${mask === 'none' || mask === 'top' ? '0px' : '2rem'};
    --scroller-footer-fade: ${mask === 'none' || mask === 'bottom' ? '0px' : '2rem'};
    --scroller-left: ${maskH === 'none' || maskH === 'left' ? '0px' : '2rem'};
    --scroller-right: ${maskH === 'none' || maskH === 'right' ? '0px' : '2rem'};
  `
</script>

<svelte:window on:resize={_resize} />

<div style={scrollerVars} class="scroller-container {invertScroll ? 'invert' : 'normal'}" class:bottomStart>
  <div class="horizontalBox" class:horizontalFade={horizontal}>
    <div
      bind:this={divScroll}
      use:resizeObserver={(element) => {
        divHeight = element.clientHeight
      }}
      class="scroll relative verticalFade"
      class:overflowXauto={horizontal}
      class:overflowXhidden={!horizontal}
      on:scroll={() => {
        if ($tooltipstore.label !== undefined) closeTooltip()
      }}
    >
      <div
        bind:this={divBox}
        class="box"
        style:padding
        style:flex-direction={contentDirection === 'vertical' ? 'column' : 'row'}
        use:resizeObserver={(element) => {
          boxHeight = element.clientHeight
          boxWidth = element.clientWidth
        }}
        on:dragover
        on:drop
      >
        <slot />
      </div>
    </div>
  </div>
  <div
    class="bar"
    class:hovered={isScrolling === 'vertical'}
    bind:this={divBar}
    on:mousedown={(ev) => onScrollStart(ev, 'vertical')}
    on:mouseleave={checkFade}
  />
  <div
    class="track"
    class:hovered={isScrolling === 'vertical'}
    class:fadeTopOffset={fade.offset?.top}
    class:fadeBottomOffset={fade.offset?.bottom}
  />
  {#if horizontal}
    <div
      class="bar-horizontal"
      class:hovered={isScrolling === 'horizontal'}
      bind:this={divBarH}
      on:mousedown={(ev) => onScrollStart(ev, 'horizontal')}
      on:mouseleave={checkFade}
    />
    <div
      class="track-horizontal"
      class:hovered={isScrolling === 'horizontal'}
      style:right={mask !== 'none' ? '12px' : '2px'}
    />
  {/if}
</div>

<style lang="scss">
  .overflowXauto {
    overflow-x: auto;
  }
  .overflowXhidden {
    overflow-x: hidden;
  }
  .scroller-container {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    min-height: 0;

    &.normal {
      .track,
      .bar {
        right: 2px;
      }
      .track-horizontal,
      .bar-horizontal {
        bottom: 2px;
      }
    }
    &.invert {
      .track,
      .bar {
        left: 2px;
      }
      .track-horizontal,
      .bar-horizontal {
        top: 2px;
      }
    }
  }
  .horizontalBox {
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;

    &.horizontalFade {
      mask-image: linear-gradient(
        90deg,
        rgba(0, 0, 0, 0) 0,
        rgba(0, 0, 0, 1) var(--scroller-left, 0),
        rgba(0, 0, 0, 1) calc(100% - var(--scroller-right, 0)),
        rgba(0, 0, 0, 0) 100%
      );
    }
  }
  .scroll {
    flex-grow: 1;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    overflow-y: auto;

    &::-webkit-scrollbar:vertical {
      width: 0;
    }
    &::-webkit-scrollbar:horizontal {
      height: 0;
    }
    &.verticalFade {
      mask-image: linear-gradient(
        0deg,
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

  .track,
  .track-horizontal {
    visibility: hidden;
    position: absolute;
    transform-origin: center;
    transform: scaleX(0);
    transition: all 0.1s ease-in-out;
    background-color: var(--scrollbar-track-color);
    border-radius: 0.5rem;
  }
  .track {
    top: 2px;
    bottom: 2px;
    width: 8px;

    &.fadeTopOffset {
      top: var(--scroller-header-height);
    }
    &.fadeBottomOffset {
      top: var(--scroller-footer-height);
    }
  }
  .track-horizontal {
    bottom: 2px;
    left: 2px;
    right: 2px;
    height: 8px;
  }
  .bar,
  .bar-horizontal {
    visibility: hidden;
    position: absolute;
    transform-origin: center;
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
      border-radius: 0.25rem;
      opacity: 1 !important;
      box-shadow: 0 0 1px black;
    }
    &.hovered {
      transition: none;
    }
  }
  .bar {
    top: 2px;
    right: 2px;
    width: 8px;
    min-height: 2rem;
    max-height: calc(100% - 12px);
    transform: scaleX(0.5);

    &:hover,
    &.hovered {
      transform: scaleX(1);

      & + .track {
        visibility: visible;
        transform: scaleX(1);
      }
    }
  }
  .bar-horizontal {
    left: 2px;
    bottom: 2px;
    height: 8px;
    min-width: 2rem;
    max-width: calc(100% - 12px);
    transform: scaleY(0.5);

    &:hover,
    &.hovered {
      transform: scaleY(1);

      & + .track-horizontal {
        visibility: visible;
        transform: scaleY(1);
      }
    }
  }
</style>
