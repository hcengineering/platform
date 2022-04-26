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
  import { createEventDispatcher } from 'svelte'
  import activity from '@anticrm/activity'
  import calendar from '@anticrm/calendar'
  import type { Doc } from '@anticrm/core'
  import notification from '@anticrm/notification'
  import type { Asset } from '@anticrm/platform'
  import { Button, AnyComponent, AnySvelteComponent, Component, IconExpand, Panel, Scroller } from '@anticrm/ui'
  import { PopupAlignment, panelsizestore } from '@anticrm/ui'

  export let title: string
  export let subtitle: string | undefined = undefined
  export let icon: Asset | AnySvelteComponent
  export let fullSize: boolean = false
  export let rightSection: AnyComponent | undefined = undefined
  export let object: Doc
  export let position: PopupAlignment | undefined = undefined

  const dispatch = createEventDispatcher()

  $: isFullSize = $panelsizestore.fullSize

  const resizePanel = () => {
    isFullSize = !isFullSize
    $panelsizestore.fullSize = isFullSize
    dispatch('update', fullSize)
  }
</script>

<Panel {title} {subtitle} {icon} on:close rightSection={isFullSize}>
  <svelte:fragment slot="subtitle">
    <slot name="subtitle" />
  </svelte:fragment>
  <svelte:fragment slot="navigate-actions">
    <slot name="navigate-actions" />
  </svelte:fragment>
  <svelte:fragment slot="commands">
    <div class="buttons-group xsmall-gap">
      <slot name="actions" />
      <Component is={calendar.component.DocReminder} props={{ value: object, title }} />
      <Component is={notification.component.LastViewEditor} props={{ value: object }} />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="rightSection">
    {#if isFullSize}
      <div class="ad-section-50">
        <Component is={rightSection ?? activity.component.Activity} props={{ object, fullSize: isFullSize }} />
      </div>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <Button
      icon={IconExpand}
      size={'medium'}
      kind={'transparent'}
      on:click={resizePanel}
    />
  </svelte:fragment>
  {#if isFullSize}
    <Scroller>
      <div class="p-10"><slot /></div>
    </Scroller>
  {:else}
    <Component is={activity.component.Activity} props={{ object, fullSize: isFullSize }}>
      <slot />
    </Component>
  {/if}
</Panel>
