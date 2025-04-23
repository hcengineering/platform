<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { type IntlString } from '@hcengineering/platform'
  import { type DropdownIntlItem, Icon, IconCheck, Label, resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let label: IntlString | undefined = undefined
  export let items: DropdownIntlItem[]
  export let selected: DropdownIntlItem['id'] | undefined = undefined
  export let onSelect: ((value: DropdownIntlItem['id'], event?: Event) => void) | undefined = undefined

  const dispatch = createEventDispatcher()

  $: withHeader = label !== undefined
  $: withIcon = items.some((it) => it.icon !== undefined)

  function handleClick (itemId: DropdownIntlItem['id']): void {
    selected = itemId
    if (onSelect !== undefined) {
      onSelect(selected)
    } else {
      dispatch('close', selected)
    }
  }
</script>

<div class="antiPopup antiPopup-withHeader thinStyle" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="ap-space" />

  {#if withHeader && label}
    <div class="ap-header">
      <div class="ap-caption">
        <Label {label} />
      </div>
    </div>

    <div class="ap-space" />

    <div class="ap-menuItem separator halfMargin" />
  {/if}

  <div class="ap-scroll">
    <div class="ap-box">
      {#each items as item, index}
        {#if index > 0}
          <div class="ap-menuItem separator halfMargin" />
        {/if}

        <button
          class="ap-menuItem noMargin flex-row-center flex-grow"
          class:withIcon
          on:click={() => {
            handleClick(item.id)
          }}
        >
          <div class="flex-between flex-grow flex-gap-2">
            <div class="flex-row-center flex-gap-2">
              {#if withIcon}
                <div class="icon">
                  {#if item.icon}
                    <Icon icon={item.icon} iconProps={item.iconProps} size={'small'} />
                  {/if}
                </div>
              {/if}

              <span class="label overflow-label font-medium">
                <Label label={item.label} params={item.params} />
              </span>
            </div>

            <div class="check">
              {#if item.id === selected}
                <IconCheck size={'small'} />
              {/if}
            </div>
          </div>
        </button>
      {/each}

      <div class="ap-space" />
    </div>
  </div>
</div>

<style lang="scss">
  .antiPopup {
    width: 20rem;
  }
</style>
