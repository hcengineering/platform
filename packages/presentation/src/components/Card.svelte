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
  import type { IntlString } from '@anticrm/platform'

  import { createEventDispatcher } from 'svelte'
  import type { Ref, Class, Space, DocumentQuery } from '@anticrm/core'

  import { Button, Label } from '@anticrm/ui'
  import SpaceSelect from './SpaceSelect.svelte'
  import presentation from '..'

  export let spaceClass: Ref<Class<Space>> | undefined = undefined
  export let space: Ref<Space> | undefined = undefined
  export let spaceQuery: DocumentQuery<Space> | undefined = { archived: false }
  export let spaceLabel: IntlString | undefined = undefined
  export let spacePlaceholder: IntlString | undefined = undefined
  export let label: IntlString
  export let labelProps: any | undefined = undefined
  export let okAction: () => void
  export let canSave: boolean = false
  export let size: 'small'| 'medium' = 'small'

  export let okLabel: IntlString = presentation.string.Create
  export let cancelLabel: IntlString = presentation.string.Cancel

  const dispatch = createEventDispatcher()
</script>

<form class="antiCard" class:w-85={size === 'small'} class:w-165={size === 'medium'} on:submit|preventDefault={ () => {} }>
  <div class="antiCard-header">
    <div class="antiCard-header__title"><Label {label} params={labelProps ?? {}} /></div>
    {#if $$slots.error}
      <div class="antiCard-header__error">
        <slot name="error" />
      </div>
    {/if}
  </div>
  <div class="antiCard-content"><slot /></div>
  {#if spaceClass && spaceLabel && spacePlaceholder}
    <div class="antiCard-pool">
      <div class="antiCard-pool__separator" />
      <SpaceSelect _class={spaceClass} spaceQuery={spaceQuery} label={spaceLabel} placeholder={spacePlaceholder} bind:value={space} />
    </div>
  {/if}
  <div class="antiCard-footer">
    <Button disabled={!canSave} label={okLabel} size={'small'} transparent primary on:click={() => { okAction(); dispatch('close') }} />
    <Button label={cancelLabel} size={'small'} transparent on:click={() => { dispatch('close') }} />
  </div>
</form>
