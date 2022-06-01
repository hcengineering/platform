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
  import { Ref, SortingOrder } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import task, { SpaceWithStates, State } from '@anticrm/task'
  import { getPlatformColor } from '@anticrm/ui'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import StatesBarElement from './StatesBarElement.svelte'
  import type { StatesBarPosition } from '../..'

  export let space: Ref<SpaceWithStates>
  export let state: Ref<State> | undefined = undefined
  export let gap: 'none' | 'small' | 'big' = 'small'

  let states: State[] = []

  let divScroll: HTMLElement
  let divBar: HTMLElement
  let isScrolling: boolean = false
  let dX: number
  let timer: number

  let maskLeft: boolean = false
  let maskRight: boolean = false
  let mask: 'left' | 'right' | 'both' | 'none' = 'none'
  let stepStyle: string
  $: stepStyle = gap === 'small' ? 'gap-1' : gap === 'big' ? 'gap-2' : ''

  const dispatch = createEventDispatcher()

  const statesQuery = createQuery()
  statesQuery.query(
    task.class.State,
    { space },
    (res) => {
      states = res
    },
    {
      sort: {
        rank: SortingOrder.Ascending
      }
    }
  )

  const checkBar = (): void => {
    if (divBar && divScroll) {
      const trackW = divScroll.clientWidth
      const scrollW = divScroll.scrollWidth
      const proc = scrollW / trackW
      divBar.style.width = divScroll.clientWidth / proc + 'px'
      divBar.style.left = divScroll.scrollLeft / proc + 'px'
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
      if (divScroll.clientWidth >= divScroll.scrollWidth) divBar.style.visibility = 'hidden'
    }
  }

  const onScroll = (event: MouseEvent): void => {
    if (isScrolling && divBar && divScroll) {
      const rectScroll = divScroll.getBoundingClientRect()
      let X = event.clientX - dX
      if (X < rectScroll.left) X = rectScroll.left
      if (X > rectScroll.right - divBar.clientWidth) X = rectScroll.right - divBar.clientWidth
      divBar.style.left = X - rectScroll.x + 'px'
      const leftBar = X - rectScroll.x
      const widthScroll = rectScroll.width - divBar.clientWidth
      const procBar = leftBar / widthScroll
      divScroll.scrollLeft = (divScroll.scrollWidth - divScroll.clientWidth) * procBar
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
      dX = event.clientX - el.getBoundingClientRect().x
      document.addEventListener('mouseup', onScrollEnd)
      document.addEventListener('mousemove', onScroll)
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
      isScrolling = true
    }
  }

  const checkMask = (): void => {
    maskLeft = !!(divScroll && divScroll.scrollLeft > 1)
    maskRight = !!(divScroll && divScroll.scrollWidth - divScroll.scrollLeft - divScroll.clientWidth > 1)
    if (maskLeft || maskRight) {
      if (maskLeft && maskRight) mask = 'both'
      else if (maskLeft) mask = 'left'
      else if (maskRight) mask = 'right'
    } else mask = 'none'

    if (!isScrolling) checkBar()
  }

  const selectItem = (ev: Event, item: State): void => {
    const el: HTMLElement = ev.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const rectScroll = divScroll.getBoundingClientRect()
    divScroll.scrollBy({
      top: 0,
      left: rect.left + rect.width / 2 - (rectScroll.left + rectScroll.width / 2),
      behavior: 'smooth'
    })
    if (state === item._id) {
      state = undefined
    } else {
      state = item._id
    }
    dispatch('change')
  }

  const getPosition = (n: number): StatesBarPosition => {
    if (n === 0) return 'start'
    else if (n === states.length - 1) return 'end'
    else return 'middle'
  }

  onMount(() => {
    if (divScroll) {
      const observer = new IntersectionObserver(() => checkMask(), { root: null, threshold: 0.1 })
      const tempEl = divScroll.querySelector('*') as HTMLElement
      if (tempEl) observer.observe(tempEl)
      checkMask()
      divScroll.addEventListener('scroll', checkMask)
    }
  })
  onDestroy(() => {
    if (divScroll) divScroll.removeEventListener('scroll', checkMask)
  })
  const _resize = (): void => checkMask()
</script>

<svelte:window on:resize={_resize} />
<div class="statesbar-container">
  <div bind:this={divScroll} class="antiStatesBar mask-{mask} {stepStyle}">
    {#each states as item, i (item._id)}
      <StatesBarElement
        label={item.title}
        position={getPosition(i)}
        selected={item._id === state}
        color={getPlatformColor(item.color)}
        on:click={(ev) => {
          if (item._id !== state) selectItem(ev, item)
        }}
      />
    {/each}
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
  .statesbar-container {
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
    box-shadow: 0 0 1px 1px var(--board-bg-color);
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
