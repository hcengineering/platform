<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import { themeStore, Label } from '@hcengineering/ui'
  import { Button, IconArrowRight, IconBlueCheck, IconClose } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import view from '../plugin'

  export let value: string = ''
  export let editable: boolean | undefined = true

  const placeholder: IntlString = view.string.HyperlinkPlaceholder
  const dispatch = createEventDispatcher()
  let input: HTMLInputElement
  let phTranslate: string
  $: translate(placeholder, {}, $themeStore.language).then((tr) => (phTranslate = tr))

  onMount(() => {
    if (input) input.focus()
  })
</script>

<div class="editor-container buttons-group xsmall-gap">
  <div class="cover-channel show">
    {#if editable}
      <input
        bind:this={input}
        class="search"
        type="text"
        bind:value
        placeholder={phTranslate}
        style="width: 100%;"
        on:keypress={(ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault()
            ev.stopPropagation()
            dispatch('close', value)
          }
        }}
        on:change
      />
    {:else if value}
      <span class="overflow-label">{value}</span>
    {:else}
      <span class="content-dark-color"><Label label={placeholder} /></span>
    {/if}
  </div>
  {#if editable}
    <Button
      focusIndex={2}
      kind={'ghost'}
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
    <Button
      id="channel-ok"
      focusIndex={3}
      kind={'ghost'}
      size={'small'}
      icon={IconBlueCheck}
      on:click={() => {
        dispatch('close', value)
      }}
    />
  {/if}
  <Button
    focusIndex={4}
    kind={'ghost'}
    size={'small'}
    icon={IconArrowRight}
    showTooltip={{ label: view.string.Open }}
    on:click={() => {
      dispatch('update', value)
      dispatch('close', 'open')
    }}
  />
</div>

<style lang="scss">
  .cover-channel {
    position: relative;
    min-width: 0;
    min-height: 0;

    &.show::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 1px solid transparent;
      border-radius: 0.25rem;
      opacity: 0.95;
    }
    &.show.copied::before {
      border-color: var(--theme-divider-color);
    }
    &.show::after {
      content: attr(data-tooltip);
      position: absolute;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      min-width: 0;
      top: 50%;
      left: 50%;
      width: calc(100% - 0.5rem);
      text-align: center;
      font-size: 0.75rem;
      color: var(--theme-content-color);
      transform: translate(-50%, -50%);
    }
  }

  .editor-container {
    padding: 0.5rem;
    background-color: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.75rem;
    box-shadow: var(--theme-popup-shadow);
  }
</style>
