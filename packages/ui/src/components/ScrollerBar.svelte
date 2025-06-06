<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { onMount } from 'svelte'
  import { resizeObserver } from '..'

  export let scroller: HTMLElement
  export let gap: 'none' | 'small' | 'big' = 'small'
  export let padding: string | undefined = undefined

  let divBar: HTMLElement
  let isScrolling: boolean = false
  let dX: number
  let timer: any

  let maskLeft: boolean = false
  let maskRight: boolean = false
  let mask: 'left' | 'right' | 'both' | 'none' = 'none'
  let stepStyle: string
  $: stepStyle = gap === 'small' ? 'gap-1' : gap === 'big' ? 'gap-2' : ''

  const checkBar = (): void => {
    if (divBar !== undefined && scroller !== undefined) {
      const trackW = scroller.clientWidth
      const scrollW = scroller.scrollWidth
      const proc = scrollW / trackW
      divBar.style.width = scroller.clientWidth / proc + 'px'
      divBar.style.left = scroller.scrollLeft / proc + 'px'
      if (mask === 'none') divBar.style.visibility = 'hidden'
      else {
        divBar.style.visibility = 'visible'
        if (divBar !== undefined) {
          if (timer != null) {
            clearTimeout(timer)
            divBar.style.opacity = '1'
          }
          timer = setTimeout(() => {
            if (divBar != null) divBar.style.opacity = '0'
          }, 2000)
        }
      }
      if (scroller.clientWidth >= scroller.scrollWidth) divBar.style.visibility = 'hidden'
    }
  }

  const onScroll = (event: PointerEvent): void => {
    if (isScrolling && divBar !== undefined && scroller !== undefined) {
      const rectScroll = scroller.getBoundingClientRect()
      let X = event.clientX - dX
      if (X < rectScroll.left) X = rectScroll.left
      if (X > rectScroll.right - divBar.clientWidth) X = rectScroll.right - divBar.clientWidth
      divBar.style.left = X - rectScroll.x + 'px'
      const leftBar = X - rectScroll.x
      const widthScroll = rectScroll.width - divBar.clientWidth
      const procBar = leftBar / widthScroll
      scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) * procBar
    }
  }
  const onScrollEnd = (event: PointerEvent): void => {
    const el: HTMLElement = event.currentTarget as HTMLElement
    if (el !== undefined && isScrolling) {
      document.removeEventListener('pointermove', onScroll)
      document.body.style.userSelect = 'auto'
      document.body.style.webkitUserSelect = 'auto'
    }
    document.removeEventListener('pointerup', onScrollEnd)
    isScrolling = false
  }
  const onScrollStart = (event: PointerEvent): void => {
    const el: HTMLElement = event.currentTarget as HTMLElement
    if (el !== undefined && scroller !== undefined) {
      dX = event.clientX - el.getBoundingClientRect().x
      document.addEventListener('pointerup', onScrollEnd)
      document.addEventListener('pointermove', onScroll)
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
      isScrolling = true
    }
  }

  const checkMask = (): void => {
    maskLeft = scroller !== undefined && scroller.scrollLeft > 1
    maskRight = scroller !== undefined && scroller.scrollWidth - scroller.scrollLeft - scroller.clientWidth > 1
    if (maskLeft || maskRight) {
      if (maskLeft && maskRight) mask = 'both'
      else if (maskLeft) mask = 'left'
      else if (maskRight) mask = 'right'
    } else mask = 'none'

    if (!isScrolling) checkBar()
  }

  onMount(() => {
    if (scroller !== undefined) checkMask()
  })
</script>

<div class="scrollerbar-container" use:resizeObserver={checkMask}>
  <div bind:this={scroller} class="antiStatesBar mask-{mask} {stepStyle}" style:padding on:scroll={checkMask}>
    <slot />
  </div>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="bar"
    class:hovered={isScrolling}
    bind:this={divBar}
    on:pointerdown={onScrollStart}
    on:pointerleave={checkMask}
  />
  <div class="track" class:hovered={isScrolling} />
</div>

<style lang="scss">
  .scrollerbar-container {
    position: relative;
    min-width: 0;
  }

  .track {
    visibility: hidden;
    position: absolute;
    bottom: -8px;
    left: 0;
    height: 5px;
    transform-origin: center;
    transform: scaleX(0);
    transition: all 0.1s ease-in-out;
    background-color: var(--scrollbar-track-color);
    border-radius: 0.25rem;
  }

  .bar {
    visibility: hidden;
    position: absolute;
    bottom: -8px;
    left: 0;
    height: 5px;
    min-width: 2rem;
    max-width: calc(100% - 12px);
    transform-origin: center;
    transform: scaleY(0.5);
    background-color: var(--scrollbar-bar-color);
    border-radius: 0.125rem;
    opacity: 0;
    box-shadow: 0 0 1px 1px var(--theme-bg-accent-color);
    cursor: pointer;
    z-index: 1;
    transition: all 0.15s;

    &:hover,
    &.hovered {
      background-color: var(--scrollbar-bar-hover);
      transform: scaleY(1);
      border-radius: 0.25rem;
      opacity: 1 !important;
      box-shadow: 0 0 1px black;

      & + .track {
        visibility: visible;
        left: 0;
        transform: scaleY(1);
      }
    }
    &.hovered {
      transition: none;
    }
  }
</style>
