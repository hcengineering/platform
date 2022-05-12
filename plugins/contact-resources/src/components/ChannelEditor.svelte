<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { createEventDispatcher, onMount } from 'svelte'
  import type { IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'
  import { Button, IconClose, closeTooltip, IconBlueCheck, registerFocus, createFocusManager } from '@anticrm/ui'
  import IconCopy from './icons/Copy.svelte'
  import { FocusHandler } from '@anticrm/ui'

  export let value: string = ''
  export let placeholder: IntlString
  export let editable: boolean = false

  const dispatch = createEventDispatcher()
  let input: HTMLInputElement
  let phTraslate: string
  translate(placeholder, {}).then((tr) => (phTraslate = tr))

  onMount(() => {
    if (input) input.focus()
  })

  const mgr = createFocusManager()

  const { idx } = registerFocus(1, {
    focus: () => {
      input?.focus()
      return true
    },
    isFocus: () => document.activeElement === input
  })

  $: if (input) {
    input.addEventListener('focus', () => {
      mgr.setFocus(idx)
    })
  }
</script>

<FocusHandler manager={mgr} />
<div class="buttons-group xsmall-gap">
  {#if editable}
    <input
      bind:this={input}
      class="search"
      type="text"
      bind:value
      placeholder={phTraslate}
      style="width: 100%;"
      on:keypress={(ev) => {
        if (ev.key === 'Enter') {
          dispatch('update', value)
          closeTooltip()
        }
      }}
      on:change
    />
    <Button
      focusIndex={2}
      kind={'transparent'}
      size={'small'}
      icon={IconClose}
      disabled={value === ''}
      on:click={() => {
        if (input) {
          value = ''
          input.focus()
        }
      }}
    />
  {:else}
    <span>{value}</span>
  {/if}
  <Button
    focusIndex={3}
    kind={'transparent'}
    size={'small'}
    icon={IconCopy}
    on:click={() => {
      navigator.clipboard.writeText(value)
    }}
  />
  {#if editable}
    <Button
      focusIndex={4}
      kind={'transparent'}
      size={'small'}
      icon={IconBlueCheck}
      on:click={() => {
        dispatch('update', value)
        closeTooltip()
      }}
    />
  {/if}
</div>
