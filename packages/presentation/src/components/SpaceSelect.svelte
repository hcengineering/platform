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
  import { onMount } from 'svelte'
  import type { IntlString } from '@anticrm/platform'
  import { getClient } from '../utils'

  import { Label, showPopup, IconFolder } from '@anticrm/ui'
  import SpacesPopup from './SpacesPopup.svelte'

  import type { Ref, Class, Space } from '@anticrm/core'

  export let _class: Ref<Class<Space>>
  export let label: IntlString
  export let placeholder: IntlString
  export let value: Ref<Space>
  export let show: boolean = false

  let selected: Space | undefined
  let btn: HTMLElement

  const client = getClient()

  async function updateSelected (value: Ref<Space>) {
    selected = await client.findOne(_class, { _id: value })
  }

  $: updateSelected(value)

  onMount(() => {
    if (btn && show) {
      btn.click()
      show = false
    }
  })
</script>

<div
  class="flex-col spaceselect-container"
  bind:this={btn}
  on:click|preventDefault={() => {
    showPopup(SpacesPopup, { _class }, btn, (result) => {
      if (result) {
        value = result._id
      }
    })
  }}
>
  <div class="overflow-label label"><Label {label} /></div>
  <div class="flex-row-center space" class:selected>
    <span class="icon"><IconFolder size={'small'} /></span>
    <span class="overflow-label">
      {#if selected}
        {selected.name}
      {:else}
        <Label label={placeholder} />
      {/if}
    </span>
  </div>
</div>

<style lang="scss">
  .spaceselect-container {
    cursor: pointer;
    .label {
      margin-bottom: 0.125rem;
      font-weight: 500;
      font-size: 0.75rem;
      color: var(--theme-content-accent-color);
    }
    .space {
      opacity: 0.3;

      .icon {
        transform-origin: center center;
        transform: scale(0.75);
        margin-right: 0.25rem;
      }
      &.selected {
        opacity: 1;
      }
    }
  }
</style>
