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
  export let isBack: boolean = false

  let mask: 'top' | 'bottom' | 'both' | 'none' = 'bottom'

  let divScroll: HTMLElement
  let divBox: HTMLElement
  let divBack: HTMLElement
  let divEl: HTMLElement

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
    } else divBack.style.visibility = 'hidden'
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
  
  const checkFade = (): void => {
    const t = divScroll.scrollTop
    const b = divScroll.scrollHeight - divScroll.clientHeight - t
    if (t > 0 && b > 0) mask = 'both'
    else if (t > 0) mask = 'bottom'
    else if (b > 0) mask = 'top'
    else mask = 'none'
    if (isBack) checkBack()
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

<svelte:window on:resize={checkFade} />
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

<style lang="scss">
  .scroll {
    flex-grow: 1;
    min-height: 0;
    // max-height: 10rem;
    height: max-content;
    overflow-x: hidden;
    overflow-y: auto;

    &::-webkit-scrollbar-track { margin: 0; }
    &::-webkit-scrollbar-thumb {
      background-color: var(--theme-bg-accent-color);
      &:hover { background-color: var(--theme-menu-divider); }
    }
  }
  .box {
    display: flex;
    flex-direction: column;
    height: 100%;
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
