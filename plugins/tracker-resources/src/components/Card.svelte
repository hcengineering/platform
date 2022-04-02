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
  import type { Asset, IntlString } from '@anticrm/platform'

  import { createEventDispatcher } from 'svelte'
  import type { Ref, Class, Space, DocumentQuery } from '@anticrm/core'

  import { Button, Label, IconAttachment, IconExpand, IconClose, MiniToggle } from '@anticrm/ui'
  import SpaceSelect from './SpaceSelect.svelte'
  import presentation from '@anticrm/presentation'
  import tracker from '../plugin'

  export let spaceClass: Ref<Class<Space>> | undefined = undefined
  export let space: Ref<Space> | undefined = undefined
  export let spaceQuery: DocumentQuery<Space> | undefined = { archived: false }
  export let spaceLabel: IntlString | undefined = undefined
  export let spacePlaceholder: IntlString | undefined = undefined
  export let label: IntlString
  export let labelProps: any | undefined = undefined
  export let icon: Asset | undefined = undefined
  export let okAction: () => void
  export let canSave: boolean = false
  export let createMore: boolean | undefined = undefined

  export let okLabel: IntlString = presentation.string.Create
  export let cancelLabel: IntlString = presentation.string.Cancel

  const dispatch = createEventDispatcher()
</script>

<form class="antiCard dialog"  on:submit|preventDefault={ () => {} }>
  <div class="antiCard-header">
    <div class="antiCard-header__title-wrap">
      <Button icon={icon} label={presentation.string.Save} size={'small'} kind={'no-border'} disabled on:click={() => { }} />
      <span class="antiCard-header__divider">›</span>
      <span class="antiCard-header__title"><Label {label} params={labelProps ?? {}} /></span>
    </div>
    <div class="buttons-group small-gap">
      <Button icon={IconExpand} kind={'transparent'} on:click={() => { }} />
      <Button icon={IconClose} kind={'transparent'} on:click={() => { dispatch('close') }} />
    </div>
  </div>
  <div class="antiCard-content"><slot /></div>
  {#if spaceClass && spaceLabel && spacePlaceholder}
    <div class="antiCard-pool">
      <slot name="pool" />
    </div>
  {/if}
  <div class="antiCard-footer reverse">
    <div class="buttons-group text-sm">
      {#if createMore !== undefined}
        <MiniToggle label={tracker.string.CreateMore} bind:on={createMore} />
      {/if}
      <Button disabled={!canSave} label={okLabel} kind={'primary'} on:click={() => { okAction(); dispatch('close') }} />
    </div>
    <Button icon={IconAttachment} kind={'transparent'} on:click={() => { }} />
  </div>
</form>
