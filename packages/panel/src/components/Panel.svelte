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
  import activity from '@anticrm/activity'
  import calendar from '@anticrm/calendar'
  import type { Doc } from '@anticrm/core'
  import notification from '@anticrm/notification'
  import type { Asset } from '@anticrm/platform'
  import { AnyComponent, AnySvelteComponent, Component, Panel } from '@anticrm/ui'

  export let title: string | undefined = undefined
  export let subtitle: string | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let showHeader: boolean = true
  export let rightSection: AnyComponent | undefined = undefined
  export let object: Doc
  export let panelWidth: number = 0
  export let innerWidth: number = 0
  export let isSubtitle: boolean = false
  export let isProperties: boolean = false
</script>

<Panel
  {title}
  {subtitle}
  {icon}
  rightSection={rightSection !== undefined}
  {showHeader}
  bind:panelWidth
  bind:innerWidth
  isProperties={innerWidth >= 500 || isProperties}
  isSubtitle={innerWidth < 900 || isSubtitle}
  on:close
>
  <svelte:fragment slot="subtitle">
    {#if $$slots.subtitle}<slot name="subtitle" />{/if}
  </svelte:fragment>
  <svelte:fragment slot="properties">
    {#if $$slots.properties}<slot name="properties" />{/if}
  </svelte:fragment>
  <svelte:fragment slot="navigate-actions">
    <slot name="navigate-actions" />
  </svelte:fragment>
  <svelte:fragment slot="commands">
    <div class="buttons-group xsmall-gap">
      <Component is={calendar.component.DocReminder} props={{ value: object, title }} />
      <Component is={notification.component.LastViewEditor} props={{ value: object }} />
    </div>
    <slot name="actions" />
  </svelte:fragment>
    <Component is={rightSection ?? activity.component.Activity} props={{ object, integrate: true }}>
      <slot />
    </Component>
</Panel>
