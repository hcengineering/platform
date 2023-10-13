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
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { generateId, Ref, Doc } from '@hcengineering/core'
  import ui from '../plugin'
  import { closePopup, showPopup } from '../popups'
  import { Action, MenuItem, MenuComponent } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import MouseSpeedTracker from './MouseSpeedTracker.svelte'
  import { resizeObserver } from '../resize'
  import Component from './Component.svelte'

  export let items: MenuItem[] = []
  export let ctx: any = undefined
  export let popupCategory: Ref<Doc> | undefined = undefined
  export let addClass: string | undefined = undefined

  const dispatch = createEventDispatcher()
  const btns: HTMLElement[] = []
  let activeElement: HTMLElement
  const category = popupCategory || generateId()
  const nextCategory = generateId()

  const keyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Tab') {
      dispatch('close')
      ev.preventDefault()
      ev.stopPropagation()
    }
    const n = btns.indexOf(activeElement) ?? 0
    if (ev.key === 'ArrowDown') {
      if (n < btns.length - 1) {
        activeElement = btns[n + 1]
      }
      ev.preventDefault()
      ev.stopPropagation()
    }
    if (ev.key === 'ArrowUp') {
      if (n > 0) {
        activeElement = btns[n - 1]
      }
      ev.preventDefault()
      ev.stopPropagation()
    }
    if (ev.key === 'ArrowLeft') {
      dispatch('update', 'left')
      closePopup(category)
      ev.preventDefault()
      ev.stopPropagation()
    }
    if (ev.key === 'ArrowRight') {
      dispatch('update', 'right')
      showActionPopup(items[n], activeElement)
      ev.preventDefault()
      ev.stopPropagation()
    }
  }

  onMount(() => {
    dispatch('update')
    if (btns[0]) {
      btns[0].focus()
    }
  })
  onDestroy(() => {
    closePopup(category)
  })

  function isAction (item: MenuItem): item is Action {
    const actionKey: keyof Action = 'action'
    return actionKey in item
  }

  function isComponent (item: MenuItem): item is MenuComponent {
    const itemComponentKey: keyof MenuComponent = 'itemComponent'
    return itemComponentKey in item
  }

  function showActionPopup (action: MenuItem, target: HTMLElement, isPopupHidden?: boolean): void {
    closePopup(category)
    closePopup(nextCategory)

    if (!isAction(action)) {
      return
    }

    if (action.component !== undefined && !isPopupHidden) {
      showPopup(
        action.component,
        { ...action.props, popupCategory: nextCategory },
        { getBoundingClientRect: () => target.getBoundingClientRect(), kind: 'submenu' },
        (evt) => {
          dispatch('close')
        },
        undefined,
        { category, overlay: false }
      )
    }
  }
  function focusTarget (action: MenuItem, target: HTMLElement, isPopupHidden?: boolean): void {
    if (focusSpeed && target !== activeElement) {
      activeElement = target
      showActionPopup(action, target, isPopupHidden)
    }
  }
  export function clearFocus (): void {
    closePopup(category)
    activeElement = popup
  }

  let focusSpeed: boolean = false
  let popup: HTMLElement

  $: popup?.focus()
</script>

<div
  class="antiPopup{addClass ? ` ${addClass}` : ''}"
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
  on:keydown={keyDown}
>
  <MouseSpeedTracker bind:focusSpeed />
  <div class="ap-space x2" />
  <slot name="header" />
  <div class="ap-scroll">
    <div class="ap-box" bind:this={popup}>
      {#if items.length === 0}
        <div class="p-6 error-color">
          <Label label={ui.string.NoActionsDefined} />
        </div>
      {/if}
      {#each items as item, i}
        {#if i > 0 && items[i - 1].group !== item.group}
          <span class="ap-menuItem separator" />
        {/if}

        {#if isAction(item)}
          {@const action = item}
          {#if action.link}
            <a class="stealth" href={action.link}>
              <!-- svelte-ignore a11y-mouse-events-have-key-events -->
              <button
                bind:this={btns[i]}
                class="ap-menuItem flex-row-center withIcon w-full"
                class:hover={btns[i] === activeElement}
                on:mousemove={() => {
                  if (btns[i] !== activeElement) focusTarget(action, btns[i])
                }}
                on:click|preventDefault|stopPropagation={(evt) => {
                  if (!action.inline) dispatch('close')
                  action.action(ctx, evt)
                }}
              >
                {#if action.icon}<div class="icon mr-2"><Icon icon={action.icon} size={'small'} /></div>{/if}
                <span class="overflow-label pr-4 flex-grow"><Label label={action.label} /></span>
              </button>
            </a>
          {:else if action.component && !action.isSubmenuRightClicking}
            <!-- svelte-ignore a11y-mouse-events-have-key-events -->
            <button
              bind:this={btns[i]}
              class="ap-menuItem withIconHover antiPopup-submenu"
              class:hover={btns[i] === activeElement}
              on:mousemove={() => {
                if (btns[i] !== activeElement) focusTarget(action, btns[i])
              }}
              on:click={() => focusTarget(action, btns[i])}
            >
              {#if action.icon}
                <div class="icon mr-2"><Icon icon={action.icon} size={'small'} /></div>
              {/if}
              <span class="overflow-label pr-4 flex-grow"><Label label={action.label} /></span>
            </button>
          {:else}
            <!-- svelte-ignore a11y-mouse-events-have-key-events -->
            <button
              bind:this={btns[i]}
              class="ap-menuItem flex-row-center withIcon"
              class:hover={btns[i] === activeElement}
              on:mousemove={() => {
                if (btns[i] !== activeElement) focusTarget(action, btns[i], action.isSubmenuRightClicking)
              }}
              on:click={(evt) => {
                if (!action.inline) dispatch('close')
                action.action(ctx, evt)
              }}
              on:contextmenu={(evt) => {
                if (action.component) {
                  evt.preventDefault()
                  showActionPopup(action, btns[i])
                }
              }}
            >
              {#if action.icon}
                <div class="icon mr-2"><Icon icon={action.icon} size={'small'} /></div>
              {/if}
              <span class="overflow-label pr-4 flex-grow"><Label label={action.label} /></span>
            </button>
          {/if}
        {:else if isComponent(item)}
          <button
            bind:this={btns[i]}
            class="ap-menuItem withIconHover"
            on:mousemove={() => {
              if (btns[i] !== activeElement) focusTarget(item, btns[i], false)
            }}
            on:click={() => focusTarget(item, btns[i], false)}
          >
            <Component is={item.itemComponent} props={item.itemProps} />
          </button>
        {/if}
      {/each}
    </div>
  </div>
  <div class="ap-space x2" />
</div>
