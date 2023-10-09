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
  import HalfUpDown from './icons/HalfUpDown.svelte'
  import { DelayedCaller } from '../utils'

  export let padding: string | undefined = undefined
  export let autoscroll: boolean = false
  export let bottomStart: boolean = false
  export let fade: FadeOptions = defaultSP
  export let noFade: boolean = true
  export let invertScroll: boolean = false
  export let contentDirection: 'vertical' | 'vertical-reverse' | 'horizontal' = 'vertical'
  export let horizontal: boolean = contentDirection === 'horizontal'
  export let gap: string | undefined = undefined
  export let noStretch: boolean = autoscroll
  export let buttons: 'normal' | 'union' | false = false
  export let shrink: boolean = false
  export let divScroll: HTMLElement | undefined = undefined
  export let checkForHeaders: boolean = false
  export let stickedScrollBars: boolean = false
  export let thinScrollBars: boolean = false

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
  let isScrolling: 'vertical' | 'horizontal' | false = false
  let dXY: number
  let belowContent: number | undefined = undefined
  let beforeContent: number | undefined = undefined
  let leftContent: number | undefined = undefined
  let rightContent: number | undefined = undefined
  let scrolling: boolean = autoscroll
  let firstScroll: boolean = autoscroll
  let orientir: 'vertical' | 'horizontal' = 'vertical'

  let timer: any | undefined = undefined
  let timerH: any | undefined = undefined

  const inter = new Set<Element>()
  let hasLastCategories: boolean = false

  $: fz = $themeOptions.fontSize
  $: shiftTop = fade.multipler?.top ? fade.multipler?.top * fz : 0
  $: shiftBottom = fade.multipler?.bottom ? fade.multipler?.bottom * fz : 0
  $: shiftLeft = fade.multipler?.left ? fade.multipler?.left * fz : 0
  $: shiftRight = fade.multipler?.right ? fade.multipler?.right * fz : 0
  $: orientir = contentDirection === 'horizontal' ? 'horizontal' : 'vertical'

  const checkBar = (): void => {
    if (divBar && divScroll) {
      dispatch('divScrollTop', divScroll.scrollTop)

      const trackH = divScroll.clientHeight - shiftTop - shiftBottom - 4
      const scrollH = divScroll.scrollHeight
      const proc = scrollH / trackH

      const newHeight = (divScroll.clientHeight - 4) / proc + 'px'
      if (divBar.style.height !== 'newHeight') {
        divBar.style.height = newHeight
      }
      const newTop = divScroll.scrollTop / proc + shiftTop + 2 + 'px'
      if (divBar.style.top !== newTop) {
        divBar.style.top = newTop
      }
      if (mask === 'none') {
        if (divBar.style.visibility !== 'hidden') {
          divBar.style.visibility = 'hidden'
        }
      } else {
        if (divBar.style.visibility !== 'visible') {
          divBar.style.visibility = 'visible'
        }
        if (divBar) {
          if (timer) {
            clearTimeout(timer)
            timer = undefined
            if (divBar.style.opacity !== '1') {
              divBar.style.opacity = '1'
            }
          }
          timer = setTimeout(() => {
            if (divBar) {
              divBar.style.opacity = '0'
            }
          }, 1500)
        }
      }
      if (divScroll.clientHeight >= divScroll.scrollHeight) {
        if (divBar.style.visibility !== 'hidden') {
          divBar.style.visibility = 'hidden'
        }
      }
    }
  }
  const checkBarH = (): void => {
    if (divBarH && divScroll) {
      const trackW = divScroll.clientWidth - (mask !== 'none' ? 14 : 4) - shiftLeft - shiftRight
      const scrollW = divScroll.scrollWidth
      const proc = scrollW / trackW
      divBarH.style.width = divScroll.clientWidth / proc + 'px'
      divBarH.style.left = divScroll.scrollLeft / proc + 2 + shiftLeft + 'px'
      if (maskH === 'none') divBarH.style.visibility = 'hidden'
      else {
        divBarH.style.visibility = 'visible'
        if (divBarH) {
          if (timerH) {
            clearTimeout(timerH)
            timerH = undefined
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
        if (X < rectScroll.left + 2 + shiftLeft) X = rectScroll.left + 2 + shiftLeft
        if (X > rectScroll.right - divBarH.clientWidth - (mask !== 'none' ? 12 : 2) - shiftRight) {
          X = rectScroll.right - divBarH.clientWidth - (mask !== 'none' ? 12 : 2) - shiftRight
        }
        divBarH.style.left = X - rectScroll.x + 'px'
        const leftBar = X - rectScroll.x - shiftLeft - 2
        const widthScroll =
          rectScroll.width - 2 - (mask !== 'none' ? 12 : 2) - divBarH.clientWidth - shiftLeft - shiftRight
        const procBar = leftBar / widthScroll
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
    if (divScroll && !noFade) {
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
    if (divHScroll && horizontal && !noFade) {
      const gradientH = `linear-gradient(
        90deg,
        rgba(0, 0, 0, 1) ${shiftLeft}px,
        rgba(0, 0, 0, 0) ${shiftLeft}px,
        rgba(0, 0, 0, 1) ${shiftLeft + (maskH === 'both' || maskH === 'right' ? 2 * fz : 0)}px,
        rgba(0, 0, 0, 1) calc(100% - ${shiftRight + (maskH === 'both' || maskH === 'left' ? 2 * fz : 0)}px),
        rgba(0, 0, 0, 0) calc(100% - ${shiftRight}px),
        rgba(0, 0, 0, 1) calc(100% - ${shiftRight}px)
      )`
      divHScroll.style.webkitMaskImage = gradientH
    }
  }

  const delayedCaller = new DelayedCaller(25)

  const delayCall = (op: () => void) => {
    delayedCaller.call(op)
  }

  const checkFade = (): void => {
    delayCall(_checkFade)
  }
  const _checkFade = (): void => {
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
      if (inter.size) {
        checkIntersectionFade()
      }
      renderFade()
    }

    if (!isScrolling) {
      checkBar()
    }
    if (!isScrolling && horizontal) {
      checkBarH()
    }
  }

  function checkAutoScroll () {
    if (firstScroll && divHeight && divScroll) {
      scrollDown()
      firstScroll = false
    }
  }

  const scrollDown = (): void => {
    if (divScroll) {
      divScroll.scrollTop = divScroll.scrollHeight - divHeight + 2
    }
  }
  $: if (scrolling && belowContent && belowContent > 0) scrollDown()

  const checkIntersection = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
    const interArr: Element[] = []
    const catEntries: IntersectionObserverEntry[] = []
    const lastCatEntries: IntersectionObserverEntry[] = []

    entries.forEach((el) => {
      if (el.isIntersecting && el.target.classList.contains('categoryHeader')) {
        inter.add(el.target)
        interArr.push(el.target)
      } else inter.delete(el.target)
      if (hasLastCategories) {
        if (el.isIntersecting && el.target.classList.contains('categoryHeader')) catEntries.push(el)
        if (el.isIntersecting && el.target.classList.contains('lastCat')) lastCatEntries.push(el)
      }
    })

    if (interArr.length > 0) {
      dispatch('lastScrolledCategory', interArr[interArr.length - 1]?.getAttribute('id'))
      dispatch('firstScrolledCategory', interArr[0]?.getAttribute('id'))
      const interCats: string[] = interArr.map((it) => it.getAttribute('id') as string)
      dispatch('scrolledCategories', interCats)
    }
    if (hasLastCategories) {
      const targets = new Set<Element>()
      const closed = new Set<Element>()
      lastCatEntries.forEach((last) => {
        catEntries.forEach((cat) => {
          if (last.target !== cat.target) {
            if (
              last.boundingClientRect.top < cat.boundingClientRect.top + 8 &&
              last.boundingClientRect.top >= cat.boundingClientRect.top
            ) {
              targets.add(cat.target)
            }
            if (cat.target.classList.contains('closed') && !closed.has(cat.target)) closed.add(cat.target)
          }
        })
      })
      closed.forEach((el) => {
        if (!targets.has(el)) el.classList.remove('closed')
      })
      targets.forEach((el) => el.classList.add('closed'))
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
    if (deltaY < 0 && autoscroll && scrolling && beforeContent && beforeContent > 0) {
      scrolling = false
    } else if (deltaY > 0 && autoscroll && !scrolling && belowContent && belowContent <= 10) {
      scrolling = true
    }
  }

  let observer: IntersectionObserver
  onMount(() => {
    if (divScroll && divBox) {
      divScroll.addEventListener('wheel', wheelEvent)
      divScroll.addEventListener('scroll', checkFade)
      delayCall(() => {
        checkBar()
        if (horizontal) {
          checkBarH()
        }
      })
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

  if (checkForHeaders) {
    beforeUpdate(() => {
      if (divBox && divScroll) {
        oldTop = divScroll.scrollTop
      }
    })

    afterUpdate(() => {
      if (divBox && divScroll) {
        if (oldTop !== divScroll.scrollTop) {
          divScroll.scrollTop = oldTop
        }

        delayCall(() => {
          if (divBox == null) {
            return
          }
          const tempEls = divBox.querySelectorAll('.categoryHeader')
          observer = new IntersectionObserver(checkIntersection, { root: null, rootMargin: '0px', threshold: 0.1 })
          tempEls.forEach((el) => observer.observe(el))
          const tempCats = divBox.querySelectorAll('.lastCat')
          if (tempCats.length > 0) {
            hasLastCategories = true
            tempCats.forEach((el) => observer.observe(el))
          } else {
            hasLastCategories = false
          }
        })
      }
    })
  }

  let divHeight: number
  const _resize = (): void => checkFade()

  const tapScroll = (n: number, dir: 'up' | 'down') => {
    if (divScroll) {
      if (orientir === 'horizontal') {
        divScroll.scrollBy({ top: 0, left: dir === 'up' ? -n : n, behavior: 'smooth' })
      } else {
        divScroll.scrollBy({ top: dir === 'up' ? -n : n, left: 0, behavior: 'smooth' })
      }
    }
  }

  const clickOnTrack = (
    ev: MouseEvent & { currentTarget: EventTarget & HTMLDivElement },
    horizontal: boolean = false
  ) => {
    if (!isScrolling && divBar && divScroll) {
      const rectScroll = divScroll.getBoundingClientRect()
      if (horizontal) {
        const x = ev.offsetX
        const trackWidth = ev.currentTarget.clientWidth
        const barWidth = divBarH.clientWidth
        const leftBar =
          x - barWidth / 2 <= 0
            ? rectScroll.left + shiftLeft + 2
            : x + barWidth / 2 >= trackWidth
              ? rectScroll.right - barWidth - shiftRight - (mask !== 'none' ? 12 : 2)
              : ev.clientX - barWidth / 2
        divBarH.style.left = `${leftBar}px`
        const widthScroll = rectScroll.width - 2 - (mask !== 'none' ? 12 : 2) - barWidth - shiftLeft - shiftRight
        const procBar = (leftBar - rectScroll.left - shiftLeft - 2) / widthScroll
        divScroll.scrollLeft = (divScroll.scrollWidth - divScroll.clientWidth) * procBar
      } else {
        const y = ev.offsetY
        const trackHeight = ev.currentTarget.clientHeight
        const barHeight = divBar.clientHeight
        const topBar =
          y - barHeight / 2 <= 0
            ? rectScroll.top + shiftTop + 2
            : y + barHeight / 2 >= trackHeight
              ? rectScroll.bottom - barHeight - shiftBottom - 2
              : ev.clientY - barHeight / 2
        divBar.style.top = `${topBar}px`
        const heightScroll = rectScroll.height - 4 - barHeight - shiftTop - shiftBottom
        const procBar = (topBar - rectScroll.top - shiftTop - 2) / heightScroll
        divScroll.scrollTop = (divScroll.scrollHeight - divScroll.clientHeight) * procBar
      }
    }
  }

  $: topButton =
    (orientir === 'vertical' && (mask === 'top' || mask === 'both')) ||
    (orientir === 'horizontal' && (maskH === 'right' || maskH === 'both'))
      ? 'visible'
      : 'hidden'
  $: bottomButton =
    (orientir === 'vertical' && (mask === 'bottom' || mask === 'both')) ||
    (orientir === 'horizontal' && (maskH === 'left' || maskH === 'both'))
      ? 'visible'
      : 'hidden'
</script>

<svelte:window on:resize={_resize} />

<div
  class="scroller-container {orientir} {invertScroll ? 'invert' : 'normal'}"
  class:buttons={buttons === 'normal'}
  class:union={buttons === 'union'}
  class:sticked={stickedScrollBars}
  class:thin={thinScrollBars}
  class:shrink
  style:user-select={isScrolling ? 'none' : 'inherit'}
  style:--scroller-header-height={`${(fade.multipler?.top ?? 0) * fz + 2}px`}
  style:--scroller-footer-height={`${(fade.multipler?.bottom ?? 0) * fz + (stickedScrollBars ? 0 : 2)}px`}
  style:--scroller-left-offset={`${(fade.multipler?.left ?? 0) * fz + 2}px`}
  style:--scroller-right-offset={`${(fade.multipler?.right ?? 0) * fz + (mask !== 'none' ? 12 : 2)}px`}
>
  <div bind:this={divHScroll} class="horizontalBox flex-col flex-shrink">
    <div
      bind:this={divScroll}
      use:resizeObserver={(element) => {
        divHeight = element.clientHeight
      }}
      class="scroll relative flex-shrink"
      style:overflow-x={horizontal ? 'auto' : 'hidden'}
      on:scroll={() => {
        if (
          $tooltipstore.label !== undefined ||
          ($tooltipstore.component !== undefined && $tooltipstore.kind !== 'submenu')
        ) {
          closeTooltip()
        }
      }}
    >
      <div
        bind:this={divBox}
        class="box{gap ? ` ${gap}` : ''}"
        class:items-center={contentDirection === 'horizontal'}
        style:padding
        style:flex-direction={contentDirection === 'vertical'
          ? 'column'
          : contentDirection === 'vertical-reverse'
          ? 'column-reverse'
          : 'row'}
        style:height={contentDirection === 'vertical-reverse' ? 'max-content' : noStretch ? 'auto' : '100%'}
        use:resizeObserver={() => {
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
  {#if buttons === 'normal'}
    <button
      class="scrollButton top {orientir}"
      style:visibility={topButton}
      on:click|preventDefault|stopPropagation={() => tapScroll(stepScroll, 'up')}
    >
      <div style:transform={orientir === 'horizontal' ? 'rotate(-90deg)' : ''}>
        <IconUpOutline size={'medium'} />
      </div>
    </button>
    <button
      class="scrollButton bottom {orientir}"
      style:visibility={bottomButton}
      on:click|preventDefault|stopPropagation={() => tapScroll(stepScroll, 'down')}
    >
      <div style:transform={orientir === 'horizontal' ? 'rotate(-90deg)' : ''}>
        <IconDownOutline size={'medium'} />
      </div>
    </button>
  {:else if buttons === 'union'}
    <div class="updown-container {orientir}">
      <button
        class="updown-up"
        style:visibility={topButton}
        on:click|preventDefault|stopPropagation={() => tapScroll(stepScroll, 'up')}
      >
        <HalfUpDown />
      </button>
      <button
        class="updown-down"
        style:visibility={bottomButton}
        on:click|preventDefault|stopPropagation={() => tapScroll(stepScroll, 'down')}
      >
        <HalfUpDown />
      </button>
    </div>
  {/if}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="track" class:hovered={isScrolling === 'vertical'} on:click|stopPropagation={(ev) => clickOnTrack(ev)} />
  <div
    class="bar"
    class:hovered={isScrolling === 'vertical'}
    bind:this={divBar}
    on:mousedown={(ev) => onScrollStart(ev, 'vertical')}
    on:mouseleave={checkFade}
  />
  {#if horizontal}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="track-horizontal"
      class:hovered={isScrolling === 'horizontal'}
      on:click|stopPropagation={(ev) => clickOnTrack(ev, true)}
    />
    <div
      class="bar-horizontal"
      class:hovered={isScrolling === 'horizontal'}
      bind:this={divBarH}
      on:mousedown={(ev) => onScrollStart(ev, 'horizontal')}
      on:mouseleave={checkFade}
    />
  {/if}
</div>

<style lang="scss">
  .updown-container {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 1rem;
    height: 1rem;
    transform-origin: center;
    transform: rotate(0deg);
    transition: transform 0.15s var(--timing-main);

    button {
      width: 1rem;
      height: 0.5rem;
      color: var(--theme-trans-color);
      border-radius: 0.25rem;
      border: none;
      outline: none;

      &:hover,
      &:focus {
        color: var(--theme-caption-color);
        background-color: ver(--theme-button-hovered);
      }
    }
    .updown-down {
      transform-origin: center;
      transform: rotate(180deg);
    }
    &.vertical {
      left: 50%;
      bottom: -2.25rem;
      transform: translate(-50%, 0) rotate(0deg);
    }
    &.horizontal {
      top: 50%;
      right: -1.5rem;
      transform: translate(0, -50%) rotate(90deg);
    }
  }
  .scrollButton {
    position: absolute;
    color: var(--theme-caption-color);
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
      background-color: var(--theme-button-hovered);
    }
    &:focus {
      box-shadow: 0 0 0 2px var(--accented-button-outline);
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
  .scroller-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 1;
    min-width: 0;
    min-height: 0;

    &:not(.shrink) {
      flex-grow: 1;
      height: 100%;
    }

    &.vertical {
      min-width: 1.5rem 0;
    }
    // &.horizontal {
    //   margin-right: 2rem;
    // }
    &.buttons.vertical {
      margin: 1.5rem 0;
    }
    &.buttons.horizontal {
      margin-right: 2rem;
    }
    &.union.vertical {
      margin-bottom: 2.75rem;
    }
    &.union.horizontal {
      margin-right: 1.5rem;
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
    will-change: opacity;
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

  .bar,
  .bar-horizontal {
    visibility: hidden;
    position: absolute;
    background-color: var(--scrollbar-bar-color);
    transform-origin: center;
    transition: all 0.15s;
    border-radius: 0.125rem;
    box-shadow: 0 0 1px 1px var(--theme-overlay-color);
    opacity: 0;
    z-index: 1;
    cursor: pointer;

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
    }
  }
  .bar-horizontal {
    left: 2px;
    bottom: var(--scroller-footer-height, 2px);
    height: 8px;
    min-width: 2rem;
    max-width: calc(100% - 12px);
    transform: scaleY(0.5);

    &:hover,
    &.hovered {
      transform: scaleY(1);
    }
  }
  .track,
  .track-horizontal {
    position: absolute;
    transform-origin: center;
    transition: all 0.1s ease-in-out;
    background-color: var(--scrollbar-track-color);
    border-radius: 0.5rem;
    opacity: 0;

    &::after {
      position: absolute;
      content: '';
      inset: 0;
      transform-origin: center;
      transition: all 0.1s ease-in-out;
    }
  }
  .track {
    top: var(--scroller-header-height, 2px);
    bottom: var(--scroller-footer-height, 2px);
    width: 8px;
    transform: scaleX(0.1);
    &::after {
      transform: scaleX(10);
    }
    &:hover {
      transform: scaleX(1);
      opacity: 1;
      &::after,
      & + .bar {
        transform: scaleX(1);
      }
    }
  }
  .track-horizontal {
    bottom: var(--scroller-footer-height, 2px);
    left: var(--scroller-left-offset, 2px);
    right: var(--scroller-right-offset, 2px);
    height: 8px;
    transform: scaleY(0.1);
    &::after {
      transform: scaleY(10);
    }
    &:hover {
      transform: scaleY(1);
      opacity: 1;
      &::after,
      & + .bar-horizontal {
        transform: scaleY(1);
      }
    }
  }
  .track:hover + .bar,
  .track-horizontal:hover + .bar-horizontal,
  .bar:hover,
  .bar-horizontal:hover,
  .bar.hovered,
  .bar-horizontal.hovered {
    background-color: var(--scrollbar-bar-hover);
    border-radius: 0.25rem;
    opacity: 1 !important;
    box-shadow: 0 0 1px black;
  }

  .scroller-container.sticked,
  .scroller-container.thin {
    .bar,
    .track {
      transform-origin: center right;
    }
    .bar-horizontal,
    .track-horizontal {
      transform-origin: bottom center;
    }
  }

  .scroller-container.sticked {
    .bar,
    .track {
      right: 0;
    }
    .bar-horizontal,
    .track-horizontal {
      bottom: var(--scroller-footer-height, 0);
    }
  }
  .scroller-container.thin {
    .bar,
    .track {
      width: 6px;
    }
    .bar-horizontal,
    .track-horizontal {
      height: 6px;
    }
  }
</style>
