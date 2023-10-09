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
  import { onDestroy, onMount } from 'svelte'

  export let scroller: HTMLElement
  export let gap: 'none' | 'small' | 'big' = 'small'

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
    if (divBar && scroller) {
      const trackW = scroller.clientWidth
      const scrollW = scroller.scrollWidth
      const proc = scrollW / trackW
      divBar.style.width = scroller.clientWidth / proc + 'px'
      divBar.style.left = scroller.scrollLeft / proc + 'px'
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
          }, 2000)
        }
      }
      if (scroller.clientWidth >= scroller.scrollWidth) divBar.style.visibility = 'hidden'
    }
  }

  const onScroll = (event: MouseEvent): void => {
    if (isScrolling && divBar && scroller) {
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
    if (el && scroller) {
      dX = event.clientX - el.getBoundingClientRect().x
      document.addEventListener('mouseup', onScrollEnd)
      document.addEventListener('mousemove', onScroll)
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
      isScrolling = true
    }
  }

  const checkMask = (): void => {
    maskLeft = !!(scroller && scroller.scrollLeft > 1)
    maskRight = !!(scroller && scroller.scrollWidth - scroller.scrollLeft - scroller.clientWidth > 1)
    if (maskLeft || maskRight) {
      if (maskLeft && maskRight) mask = 'both'
      else if (maskLeft) mask = 'left'
      else if (maskRight) mask = 'right'
    } else mask = 'none'

    if (!isScrolling) checkBar()
  }

  onMount(() => {
    if (scroller) {
      const observer = new IntersectionObserver(() => checkMask(), { root: null, threshold: 0.1 })
      const tempEl = scroller.querySelector('*') as HTMLElement
      if (tempEl) observer.observe(tempEl)
      checkMask()
      scroller.addEventListener('scroll', checkMask)
    }
  })
  onDestroy(() => {
    if (scroller) scroller.removeEventListener('scroll', checkMask)
  })
  const _resize = (): void => checkMask()
</script>

<svelte:window on:resize={_resize} />
<div class="scrollerbar-container">
  <div bind:this={scroller} class="antiStatesBar mask-{mask} {stepStyle}">
    <slot />
  </div>
  <div
    class="bar"
    class:hovered={isScrolling}
    bind:this={divBar}
    on:mousedown={onScrollStart}
    on:mouseleave={checkMask}
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
