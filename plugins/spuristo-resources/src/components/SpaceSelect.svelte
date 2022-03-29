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
  import type { Class, DocumentQuery, Ref, Space } from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { IconFolder, Label, showPopup } from '@anticrm/ui'
  import { onMount } from 'svelte'
  import SpacesPopup from './SpacesPopup.svelte'

  export let _class: Ref<Class<Space>>
  export let spaceQuery: DocumentQuery<Space> | undefined = { archived: false }
  export let label: IntlString
  export let placeholder: IntlString
  export let value: Ref<Space> | undefined
  export let show: boolean = false

  let selected: Space | undefined
  let btn: HTMLElement

  const client = getClient()

  async function updateSelected (value: Ref<Space> | undefined) {
    selected = value !== undefined ? await client.findOne(_class, { ...(spaceQuery ?? {}), _id: value }) : undefined
  }

  $: updateSelected(value)

  onMount(() => {
    if (btn && show) {
      btn.click()
      show = false
    }
  })
</script>

<div class="flex-col cursor-pointer"
  bind:this={btn}
  on:click|preventDefault={() => {
    showPopup(SpacesPopup, { _class, spaceQuery }, btn, (result) => {
      if (result) {
        value = result._id
      }
    })
  }}
>
  <div class="overflow-label label"><Label {label} /></div>
  <div class="flex-row-center space">
    <span class="mr-1"><IconFolder size={'small'} /></span>
    <span class="overflow-label" class:caption-color={selected} class:content-dark-color={!selected}>
      {#if selected}
        {selected.name}
      {:else}
        <Label label={placeholder} />
      {/if}
    </span>
  </div>
</div>

<style lang="scss">
  .label {
    margin-bottom: .125rem;
    font-weight: 500;
    font-size: .75rem;
    color: var(--theme-content-accent-color);
  }
</style>
