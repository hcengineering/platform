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
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte'
  import ui from '../plugin'
  import { Action } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'

  export let actions: Action[] = []
  export let ctx: any = undefined

  const dispatch = createEventDispatcher()
  const btns: HTMLButtonElement[] = []

  const keyDown = (ev: KeyboardEvent, n: number): void => {
    if (ev.key === 'Tab') {
      dispatch('close')
    }
    if (ev.key === 'ArrowDown') {
      if (n === btns.length - 1) btns[0].focus()
      else btns[n + 1].focus()
    }
    if (ev.key === 'ArrowUp') {
      if (n === 0) btns[btns.length - 1].focus()
      else btns[n - 1].focus()
    }
    if (ev.key === 'ArrowLeft' && ev.altKey) dispatch('update', 'left')
    if (ev.key === 'ArrowRight' && ev.altKey) dispatch('update', 'right')
  }

  afterUpdate(() => {
    dispatch('update', Date.now())
  })
  onMount(() => {
    if (btns[0]) btns[0].focus()
  })
</script>

<div class="antiPopup">
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="ap-box">
      {#if actions.length === 0}
        <div class="p-6 error-color">
          <Label label={ui.string.NoActionsDefined} />
        </div>
      {/if}
      {#each actions as action, i}
        {#if action.link}
          <a class="stealth" href={action.link}>
            <!-- svelte-ignore a11y-mouse-events-have-key-events -->
            <button
              bind:this={btns[i]}
              class="ap-menuItem flex-row-center withIcon w-full"
              on:keydown={(evt) => keyDown(evt, i)}
              on:mouseover={(evt) => evt.currentTarget.focus()}
              on:click|preventDefault|stopPropagation={(evt) => {
                if (!action.inline) dispatch('close')
                action.action(ctx, evt)
              }}
            >
              {#if action.icon}<div class="icon mr-3"><Icon icon={action.icon} size={'small'} /></div>{/if}
              <span class="overflow-label pr-1"><Label label={action.label} /></span>
            </button>
          </a>
        {:else}
          <!-- svelte-ignore a11y-mouse-events-have-key-events -->
          <button
            bind:this={btns[i]}
            class="ap-menuItem flex-row-center withIcon"
            on:keydown={(evt) => keyDown(evt, i)}
            on:mouseover={(evt) => evt.currentTarget.focus()}
            on:click={(evt) => {
              if (!action.inline) dispatch('close')
              action.action(ctx, evt)
            }}
          >
            {#if action.icon}
              <div class="icon mr-3"><Icon icon={action.icon} size={'small'} /></div>
            {/if}
            <span class="overflow-label pr-1"><Label label={action.label} /></span>
          </button>
        {/if}
      {/each}
    </div>
  </div>
  <div class="ap-space" />
</div>
