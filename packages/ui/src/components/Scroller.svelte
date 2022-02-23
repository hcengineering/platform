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
  let divTHead: HTMLElement
  let elTHead: Element
  let isBack: boolean = false  // ?
  let isTHead: boolean = false
  let hasTHeads: boolean = false  // ?
  let isScrolling: boolean = false
  let enabledChecking: boolean = false
  let dY: number
  let visibleEl: number | undefined = undefined

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

  const checkTHeadSizes = (): void => {
    if (elTHead && divTHead && divScroll) {
      const elements = divTHead.querySelectorAll('div')
      elements.forEach((el, i) => {
        const th = elTHead.children.item(i)
        if (th) el.style.width = th.clientWidth + 'px'
      })
    }
  }

  const clearTHead = (): void => {
    visibleEl = undefined
    divTHead.innerHTML = ''
    divTHead.style.visibility = 'hidden'
    divTHead.style.opacity = '0'
    isTHead = false
  }

  const fillTHead = (el: Element): boolean => {
    const tr: Element | null = el.children.item(0)
    if (tr) {
      for (let i = 0; i < tr.children.length; i++) {
        const th = tr.children.item(i)
        if (th) {
          let newStyle = `flex-shrink: 0; width: ${th.clientWidth}px; `
          if ((i === 0 && !enabledChecking) || (i === 1 && enabledChecking)) newStyle += `padding-right: 1.5rem;`
          else if (i === tr.children.length - 1) newStyle += `padding-left: 1.5rem;`
          else if (i === 0 && enabledChecking) newStyle += `padding: 0 .75rem;`
          else newStyle += `padding: 0 1.5rem;`
          if (th.classList.contains('sorted')) newStyle += ` margin-right: .25rem;`
          divTHead.insertAdjacentHTML('beforeend', `<div style="${newStyle}">${tr.children.item(i)?.textContent}</div>`)
        }
      }
      isTHead = true
      elTHead = tr
    }
    return isTHead
  }

  const findTHeaders = (): void => {
    if (divBox) {
      const elements = divBox.querySelectorAll('.scroller-thead')
      if (elements.length > 0 && divScroll) {
        const rectScroll = divScroll.getBoundingClientRect()
        hasTHeads = true
        elements.forEach((el, i) => {
          const rect = el.getBoundingClientRect()
          enabledChecking = el.parentElement?.classList.contains('enableChecking') ?? false
          const rectTable = el.parentElement?.getBoundingClientRect()
          if (rectTable) {
            if (rectTable.top < rectScroll.top && rectTable.bottom > rectScroll.top + rect.height) {
              if (!isTHead && divTHead)
                if (fillTHead(el)) visibleEl = i
              if (isTHead) {
                if (rect.width > rectScroll.width) divTHead.style.width = rectScroll.width + 'px'
                else divTHead.style.width = rect.width + 'px'
                divTHead.style.height = rect.height + 'px'
                divTHead.style.left = rect.left + 'px'
                if (rect.bottom - 16 < rectScroll.top && rectTable.bottom > rectScroll.top + rect.height) {
                  divTHead.style.top = rectScroll.top + 'px'
                  divTHead.style.visibility = 'visible'
                  divTHead.style.opacity = '.9'
                } else {
                  divTHead.style.top = rect.top + 'px'
                  divTHead.style.visibility = 'hidden'
                  divTHead.style.opacity = '0'
                }
              }
            } else if ((rectTable.top > rectScroll.top + rect.height || rectTable.bottom < rectScroll.top + rect.height) && isTHead && visibleEl === i)
              clearTHead()
          }
        })
      } else hasTHeads = false
    }
  }

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
    if (divScroll) {
      const t = divScroll.scrollTop
      const b = divScroll.scrollHeight - divScroll.clientHeight - t
      if (t > 0 && b > 0) mask = 'both'
      else if (t > 0) mask = 'bottom'
      else if (b > 0) mask = 'top'
      else mask = 'none'
    }
    checkBack()
    findTHeaders()
    if (isTHead) checkTHeadSizes()
    if (!isScrolling) checkBar()
  }

  let observer = new IntersectionObserver(() => checkFade(), { root: null, threshold: .1 })

  onMount(() => {
    if (divScroll && divBox) {
      divScroll.addEventListener('scroll', checkFade)
      const tempEl = divBox.querySelector('*') as HTMLElement
      if (tempEl) observer.observe(tempEl)
      checkFade()
    }
    if (divBack) checkBack()
  })
  onDestroy(() => { if (divScroll) divScroll.removeEventListener('scroll', checkFade) })
  afterUpdate(() => {
    if (divScroll && divBox) {
      const tempEl = divBox.querySelector('*') as HTMLElement
      if (tempEl) observer.observe(tempEl)
      checkFade()
    }
  })
</script>

<svelte:window on:resize={checkFade} />
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
  <div bind:this={divTHead} class="fly-head thead-style" />
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
    transition: all .1s;

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
    width: 0;
    height: 0;
    // background-color: red;
    background-color: var(--theme-bg-accent-color);
    z-index: -1;
  }
  .fly-head {
    overflow: hidden;
    position: fixed;
    pointer-events: none;
    visibility: hidden;
    transition: top .2s ease-out, opacity .2s;
  }
  .thead-style {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 2.5rem;
    font-weight: 500;
    font-size: 0.75rem;
    color: var(--theme-content-dark-color);
    background-color: var(--theme-bg-color);
    box-shadow: inset 0 -1px 0 0 var(--theme-bg-focused-color);
    user-select: none;
  }
</style>
