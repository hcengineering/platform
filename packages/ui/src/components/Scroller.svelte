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
  import { themeStore as themeOptions } from '@hcengineering/theme'
  import { afterUpdate, beforeUpdate, createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { resizeObserver } from '../resize'
  import { closeTooltip, tooltipstore } from '../tooltips'
  import type { FadeOptions } from '../types'
  import { defaultSP } from '../types'
  import IconUpOutline from './icons/UpOutline.svelte'
  import IconDownOutline from './icons/DownOutline.svelte'

  export let padding: string | undefined = undefined
  export let autoscroll: boolean = false
  export let bottomStart: boolean = false
  export let fade: FadeOptions = defaultSP
  export let invertScroll: boolean = false
  export let horizontal: boolean = false
  export let contentDirection: 'vertical' | 'vertical-reverse' | 'horizontal' = 'vertical'
  export let noStretch: boolean = autoscroll
  export let buttons: boolean = false
  export let shrink: boolean = false
  export let divScroll: HTMLElement | undefined = undefined

  export function scroll (top: number, left?: number, behavior: 'auto' | 'smooth' = 'auto') {
    if (divScroll) {
      if (top !== 0) divScroll.scroll({ top, left: 0, behavior })
      if (left !== 0 || left !== undefined) divScroll.scroll({ top: 0, left, behavior })
    }
  }
  export function scrollBy (top: number, left?: number, behavior: 'auto' | 'smooth' = 'auto') {
    if (divScroll) {
      if (top !== 0) divScroll.scrollBy({ top, left: 0, behavior })
      if (left !== 0 || left !== undefined) divScroll.scrollBy({ top: 0, left, behavior })
    }
  }

  const dispatch = createEventDispatcher()
  const stepScroll = 52

  let mask: 'top' | 'bottom' | 'both' | 'none' = 'none'
  let topCrop: 'top' | 'bottom' | 'full' | 'none' = 'none'
  let topCropValue: number = 0
  let maskH: 'left' | 'right' | 'both' | 'none' = 'none'

  let divHScroll: HTMLElement
  let divBox: HTMLElement
  let divBar: HTMLElement
  let divBarH: HTMLElement
  let divScrollContainer: HTMLElement
  let isScrolling: 'vertical' | 'horizontal' | false = false
  let dXY: number
  let belowContent: number | undefined = undefined
  let beforeContent: number | undefined = undefined
  let leftContent: number | undefined = undefined
  let rightContent: number | undefined = undefined
  let scrolling: boolean = autoscroll
  let firstScroll: boolean = autoscroll
  let orientir: 'vertical' | 'horizontal' = 'vertical'

  let timer: number
  let timerH: number

  const inter = new Set<Element>()

  $: fz = $themeOptions.fontSize
  $: shiftTop = fade.multipler?.top ? fade.multipler?.top * fz : 0
  $: shiftBottom = fade.multipler?.bottom ? fade.multipler?.bottom * fz : 0
  $: orientir = contentDirection === 'horizontal' ? 'horizontal' : 'vertical'

  const checkBar = (): void => {
    if (divBar && divScroll) {
      const trackH = divScroll.clientHeight - shiftTop - shiftBottom - 4
      const scrollH = divScroll.scrollHeight
      const proc = scrollH / trackH
      divBar.style.height = divScroll.clientHeight / proc + 'px'
      divBar.style.top = divScroll.scrollTop / proc + shiftTop + 2 + 'px'
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

  const renderFade = () => {
    if (divScroll) {
      const th = shiftTop + (topCrop === 'top' ? 2 * fz - topCropValue : 0)
      const tf =
        topCrop === 'full'
          ? 0
          : mask === 'both' || mask === 'top'
            ? 2 * fz - (topCrop === 'bottom' ? topCropValue : topCrop === 'top' ? 2 * fz - topCropValue : 0)
            : 0
      const gradient = `linear-gradient(
        0deg,
        rgba(0, 0, 0, 1) ${shiftBottom}px,
        rgba(0, 0, 0, 0) ${shiftBottom}px,
        rgba(0, 0, 0, 1) ${shiftBottom + (mask === 'both' || mask === 'bottom' ? 2 * fz : 0)}px,
        rgba(0, 0, 0, 1) calc(100% - ${th + tf}px),
        rgba(0, 0, 0, 0) calc(100% - ${th}px),
        rgba(0, 0, 0, 1) calc(100% - ${th}px)
      )`
      divScroll.style.webkitMaskImage = gradient
    }
    if (divHScroll && horizontal) {
      const gradientH = `linear-gradient(
        90deg,
        rgba(0, 0, 0, 0) 0,
        rgba(0, 0, 0, 1) ${maskH === 'none' || maskH === 'left' ? '0px' : '2rem'},
        rgba(0, 0, 0, 1) calc(100% - ${maskH === 'none' || maskH === 'right' ? '0px' : '2rem'}),
        rgba(0, 0, 0, 0) 100%
      )`
      divHScroll.style.webkitMaskImage = gradientH
    }
  }

  const checkFade = (): void => {
    if (divScroll) {
      beforeContent = divScroll.scrollTop
      belowContent = divScroll.scrollHeight - divScroll.clientHeight - beforeContent
      if (beforeContent > 2 && belowContent > 2) mask = 'both'
      else if (beforeContent > 2) mask = 'top'
      else if (belowContent > 2) mask = 'bottom'
      else mask = 'none'

      if (horizontal) {
        leftContent = divScroll.scrollLeft
        rightContent = divScroll.scrollWidth - divScroll.clientWidth - leftContent
        if (leftContent > 2 && rightContent > 2) maskH = 'both'
        else if (leftContent > 2) maskH = 'right'
        else if (rightContent > 2) maskH = 'left'
        else maskH = 'none'
      }
      if (inter.size) checkIntersectionFade()
      renderFade()
    }
    if (!isScrolling) checkBar()
    if (!isScrolling && horizontal) checkBarH()
  }

  function checkAutoScroll () {
    if (firstScroll && divHeight && divScroll) {
      scrollDown()
      firstScroll = false
    }
  }

  const scrollDown = (): void => {
    if (divScroll) divScroll.scrollTop = divScroll.scrollHeight - divHeight + 2
  }
  $: if (scrolling && belowContent && belowContent > 0) scrollDown()

  const checkIntersection = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
    const interArr: Element[] = []
    entries.forEach((el) => {
      if (el.isIntersecting) {
        inter.add(el.target)
        interArr.push(el.target)
      } else inter.delete(el.target)
    })
    if (interArr.length > 0) {
      dispatch('lastScrolledCategory', interArr[interArr.length - 1]?.getAttribute('id'))
      const interCats: string[] = interArr.map((it) => it.getAttribute('id') as string)
      dispatch('scrolledCategories', interCats)
    }
  }

  const checkIntersectionFade = () => {
    topCrop = 'none'
    topCropValue = 0
    if (!fade.multipler?.top || !divScroll) return
    const offset = divScroll.getBoundingClientRect().top
    inter.forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (shiftTop > 0) {
        if (offset + shiftTop < rect.top && offset + shiftTop + 2 * fz >= rect.top) {
          if (topCrop === 'top' || topCrop === 'full') topCrop = 'full'
          else topCrop = 'bottom'
          topCropValue = offset + shiftTop + 2 * fz - rect.top
        } else if (offset + shiftTop < rect.bottom && offset + shiftTop + 2 * fz > rect.bottom) {
          topCrop = 'top'
          topCropValue = offset + shiftTop + 2 * fz - rect.bottom
        } else if (offset + shiftTop >= rect.top && offset + shiftTop + 2 * fz <= rect.bottom) {
          topCrop = 'full'
          topCropValue = offset + shiftTop + 2 * fz
        }
      }
    })
  }

  const wheelEvent = (e: WheelEvent) => {
    e = e || window.event
    const deltaY = e.deltaY
    if (deltaY < 0 && autoscroll && scrolling && beforeContent && beforeContent > 0) scrolling = false
    else if (deltaY > 0 && autoscroll && !scrolling && belowContent && belowContent <= 10) scrolling = true
  }

  let observer: IntersectionObserver
  onMount(() => {
    if (divScroll && divBox) {
      divScroll.addEventListener('wheel', wheelEvent)
      divScroll.addEventListener('scroll', checkFade)
      checkBar()
      if (horizontal) checkBarH()
    }
  })
  onDestroy(() => {
    if (observer) observer.disconnect()
    if (divScroll) {
      divScroll.removeEventListener('wheel', wheelEvent)
      divScroll.removeEventListener('scroll', checkFade)
    }
  })

  let oldTop: number
  beforeUpdate(() => {
    if (divBox && divScroll) oldTop = divScroll.scrollTop
  })
  afterUpdate(() => {
    if (divBox && divScroll) {
      if (oldTop !== divScroll.scrollTop) divScroll.scrollTop = oldTop

      const tempEls = divBox.querySelectorAll('.categoryHeader')
      observer = new IntersectionObserver(checkIntersection, { root: null, rootMargin: '0px', threshold: 0.1 })
      tempEls.forEach((el) => observer.observe(el))
    }
  })

  let divHeight: number
  const _resize = (): void => checkFade()

  const tapScroll = (n: number, dir: 'up' | 'down') => {
    if (divScroll) {
      if (orientir === 'horizontal') divScroll.scrollBy({ top: 0, left: dir === 'up' ? -n : n, behavior: 'smooth' })
      else divScroll.scrollBy({ top: dir === 'up' ? -n : n, left: 0, behavior: 'smooth' })
    }
  }
</script>

<svelte:window on:resize={_resize} />

<div
  bind:this={divScrollContainer}
  class="scroller-container {orientir} {invertScroll ? 'invert' : 'normal'}"
  class:buttons
  class:shrink
  style:--scroller-header-height={`${fade.multipler?.top ?? 0.125}rem`}
  style:--scroller-footer-height={`${fade.multipler?.bottom ?? 0.125}rem`}
>
  <div bind:this={divHScroll} class="horizontalBox flex-col flex-shrink">
    <div
      bind:this={divScroll}
      use:resizeObserver={(element) => {
        divHeight = element.clientHeight
      }}
      class="scroll relative flex-shrink"
      class:overflowXauto={horizontal}
      class:overflowXhidden={!horizontal}
      on:scroll={() => {
        if ($tooltipstore.label !== undefined) closeTooltip()
      }}
    >
      <div
        bind:this={divBox}
        class="box"
        class:align-center={contentDirection === 'horizontal'}
        style:padding
        style:flex-direction={contentDirection === 'vertical'
          ? 'column'
          : contentDirection === 'vertical-reverse'
          ? 'column-reverse'
          : 'row'}
        style:height={contentDirection === 'vertical-reverse' ? 'max-content' : noStretch ? 'auto' : '100%'}
        use:resizeObserver={(element) => {
          checkAutoScroll()
          checkFade()
        }}
        on:dragover
        on:drop
        on:scroll
      >
        {#if bottomStart}<div class="flex-grow flex-shrink" />{/if}
        <slot />
      </div>
    </div>
  </div>
  {#if buttons}
    <button
      class="scrollButton top {orientir}"
      style:visibility={(orientir === 'vertical' && (mask === 'top' || mask === 'both')) ||
      (orientir === 'horizontal' && (maskH === 'right' || maskH === 'both'))
        ? 'visible'
        : 'hidden'}
      on:click|preventDefault|stopPropagation={() => tapScroll(stepScroll, 'up')}
    >
      <div style:transform={orientir === 'horizontal' ? 'rotate(-90deg)' : ''}>
        <IconUpOutline size={'medium'} />
      </div>
    </button>
    <button
      class="scrollButton bottom {orientir}"
      style:visibility={(orientir === 'vertical' && (mask === 'bottom' || mask === 'both')) ||
      (orientir === 'horizontal' && (maskH === 'left' || maskH === 'both'))
        ? 'visible'
        : 'hidden'}
      on:click|preventDefault|stopPropagation={() => tapScroll(stepScroll, 'down')}
    >
      <div style:transform={orientir === 'horizontal' ? 'rotate(-90deg)' : ''}>
        <IconDownOutline size={'medium'} />
      </div>
    </button>
  {/if}
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
    class:fadeTopOffset={fade.multipler?.top}
    class:fadeBottomOffset={fade.multipler?.bottom}
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
  .scrollButton {
    position: absolute;
    color: var(--caption-color);
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    visibility: hidden;

    transform-origin: center;
    transition-property: opacity, transform;
    transition-timing-function: var(--timing-main);
    transition-duration: 0.1s;
    transform: scale(0.8);
    opacity: 0.1;

    &:hover,
    &:focus {
      transform: scale(1);
      opacity: 0.8;
    }
    &:hover {
      background-color: var(--button-bg-color);
    }
    &:focus {
      border-color: var(--primary-edit-border-color);
    }
    &.vertical {
      width: 2rem;
      height: 1.25rem;
    }
    &.horizontal {
      width: 1.25rem;
      height: 2rem;
    }
    &.top.vertical {
      top: calc(var(--scroller-header-height) - 2rem);
      left: 50%;
      transform: translateX(-50%);
    }
    &.top.horizontal {
      top: 50%;
      left: -2rem;
      transform: translateY(-50%);
    }
    &.bottom.vertical {
      right: 50%;
      bottom: calc(var(--scroller-footer-height) - 2rem);
      transform: translateX(50%);
    }
    &.bottom.horizontal {
      right: -2rem;
      bottom: 50%;
      transform: translateY(50%);
    }
  }
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
    flex-shrink: 1;
    min-width: 0;
    min-height: 0;

    &:not(.shrink) {
      flex-grow: 1;
      height: 100%;
    }

    &.buttons.vertical {
      margin: 1.5rem 0;
    }
    &.buttons.horizontal {
      margin: 0 1.5rem;
    }
    &.normal {
      .track,
      .bar {
        right: 2px;
      }
      .track-horizontal,
      .bar-horizontal {
        bottom: var(--scroller-footer-height);
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
    flex-grow: 1;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
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
  }
  .box {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
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
      bottom: var(--scroller-footer-height);
    }
  }
  .track-horizontal {
    bottom: var(--scroller-footer-height);
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
    bottom: var(--scroller-footer-height);
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
