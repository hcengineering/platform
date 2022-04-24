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
  import type { Class, DocumentQuery, Ref, Space } from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import { Button, IconClose, Label, MiniToggle } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'
  import { getClient } from '../utils'
  import SpaceSelect from './SpaceSelect.svelte'

  export let spaceClass: Ref<Class<Space>> | undefined = undefined
  export let space: Ref<Space> | undefined = undefined
  export let spaceQuery: DocumentQuery<Space> | undefined = { archived: false }
  export let spaceLabel: IntlString | undefined = undefined
  export let spacePlaceholder: IntlString | undefined = undefined
  export let label: IntlString
  export let labelProps: any | undefined = undefined
  export let okAction: () => void
  export let canSave: boolean = false
  export let createMore: boolean | undefined = undefined
  export let okLabel: IntlString = presentation.string.Create

  const dispatch = createEventDispatcher()
  const client = getClient()

  $: if (space === undefined && spaceClass !== undefined) {
    client.findOne(spaceClass, { ...(spaceQuery ?? {}) }).then((res) => {
      space = res?._id
    })
  }
</script>

<form class="antiCard dialog" on:submit|preventDefault={ () => {} }>
  <div class="antiCard-header">
    <div class="antiCard-header__title-wrap">
      {#if spaceClass && spaceLabel && spacePlaceholder}
        {#if $$slots.space}
          <slot name="space" />
        {:else}
          <SpaceSelect _class={spaceClass} spaceQuery={spaceQuery} label={spaceLabel} placeholder={spacePlaceholder} bind:value={space} />
        {/if}
        <span class="antiCard-header__divider">›</span>
      {/if}
      <span class="antiCard-header__title"><Label {label} params={labelProps ?? {}} /></span>
    </div>
    <div class="buttons-group small-gap">
      <Button icon={IconClose} kind={'transparent'} on:click={() => { dispatch('close') }} />
    </div>
  </div>
  <div class="antiCard-content"><slot /></div>
  {#if (spaceClass && spaceLabel && spacePlaceholder) || $$slots.pool}
    <div class="antiCard-pool">
      <slot name="pool" />
    </div>
  {/if}
  <div class="antiCard-footer reverse">
    <div class="buttons-group text-sm flex-no-shrink">
      {#if createMore !== undefined}
        <MiniToggle label={presentation.string.CreateMore} bind:on={createMore} />
      {/if}
      <Button disabled={!canSave} label={okLabel} kind={'primary'} on:click={() => { okAction(); dispatch('close') }} />
    </div>
    <div class="buttons-group small-gap text-sm">
      <slot name="footer" />
      {#if $$slots.error}
        <div class="antiCard-footer__error">
          <slot name="error" />
        </div>
      {/if}
    </div>
  </div>
</form>
