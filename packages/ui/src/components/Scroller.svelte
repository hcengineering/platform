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

  let mask: 'top' | 'bottom' | 'both' | 'none' = 'bottom'

  let divScroll: HTMLElement
  let divBox: HTMLElement
  let divBack: HTMLElement
  let divBar: HTMLElement
  let divTrack: HTMLElement
  let divEl: HTMLElement
  let isBack: boolean = false
  let isScrolling: boolean = false
  let dY: number

  const checkBack = (): void => {
    const rectScroll = divScroll.getBoundingClientRect()
    const el = divBox.querySelector('.scroller-back')
    if (el && divScroll) {
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

  let observer = new IntersectionObserver(changes => {
    for (const change of changes) {
      if (divBack) {
        let rect = change.intersectionRect
        if (rect) {
          divBack.style.left = rect.left + 'px'
          divBack.style.right = document.body.clientWidth - rect.right + 'px'
          divBack.style.top = rect.top + 'px'
          divBack.style.bottom = document.body.clientHeight - rect.bottom + 'px'
          if (change.target) {
            const temp: HTMLElement = change.target as HTMLElement
            divBack.style.backgroundColor = temp.style.backgroundColor
          }
        } else divBack.style.visibility = 'hidden'
      }
    }
  }, { root: null, threshold: .1 })

  const checkBar = (): void => {
    if (divBar && divScroll) {
      const proc = divScroll.clientHeight / divScroll.scrollHeight * 100
      const procScroll = (divScroll.clientHeight - 4) / 100
      const procTop = divScroll.scrollTop / divScroll.scrollHeight
      divBar.style.height = procScroll * proc + 'px'
      divBar.style.top = procTop * (divScroll.clientHeight - 4) + 2 + 'px'
      if (mask === 'none') divBar.style.visibility = 'hidden'
      else divBar.style.visibility = 'visible'
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
    const t = divScroll.scrollTop
    const b = divScroll.scrollHeight - divScroll.clientHeight - t
    if (t > 0 && b > 0) mask = 'both'
    else if (t > 0) mask = 'bottom'
    else if (b > 0) mask = 'top'
    else mask = 'none'
    checkBack()
    if (!isScrolling) checkBar()
  }

  onMount(() => {
    if (divScroll && divBox) {
      divScroll.addEventListener('scroll', checkFade)
      const tempEl = divBox.querySelector('*') as HTMLElement
      observer.observe(tempEl)
      if (divBox.querySelector('.scroller-back')) {
        divEl = divBox.querySelector('.scroller-back') as HTMLElement
        observer.observe(divEl)
      }
    }
    if (divBack) checkBack()
  })
  onDestroy(() => { if (divScroll) divScroll.removeEventListener('scroll', checkFade) })
  afterUpdate(() => { if (divScroll) checkFade() })
</script>

<svelte:window on:resize={checkFade}  />
<div class="scroller-container">
  <div
    bind:this={divScroll}
    class="scroll relative"
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
  <div
    class="bar"
    class:hovered={isScrolling}
    bind:this={divBar}
    on:mousedown={onScrollStart}
  />
  <div
    class="track"
    class:hovered={isScrolling}
    bind:this={divTrack}
  />
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
    // max-height: 10rem;
    height: max-content;
    overflow-x: hidden;
    overflow-y: auto;

    &::-webkit-scrollbar:vertical { width: 0; }
  }
  .box {
    display: flex;
    flex-direction: column;
    height: 100%;
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
    transition: all .1s ease-in-out;
    background-color: var(--theme-menu-color);
    border-radius: .5rem;
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
    transform: scaleX(.5);
    background-color: var(--theme-button-bg-focused);
    border-radius: .125rem;
    opacity: .5;
    cursor: pointer;
    z-index: 1;
    transition: all .1s ease-in-out;

    &:hover, &.hovered {
      background-color: var(--theme-button-bg-hovered);
      transform: scaleX(1);
      border-radius: .25rem;
      opacity: 1;
      filter: drop-shadow(0 0 1px black);

      & + .track {
        visibility: visible;
        right: 2px;
        transform: scaleX(1);
      }
    }
    &.hovered { transition: none; }
  }
  .back {
    visibility: hidden;
    position: fixed;
    // left: 0;
    // right: 0;
    width: 0;
    height: 0;
    background-color: var(--theme-bg-accent-color);
    z-index: -1;
  }
</style>
