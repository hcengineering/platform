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
  import { AnySvelteComponent, Component, Panel, Icon, Scroller } from '@anticrm/ui'

  export let title: string | undefined = undefined
  export let subtitle: string | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let withoutActivity: boolean = false
  export let object: Doc
  export let panelWidth: number = 0
  export let innerWidth: number = 0
  export let isHeader: boolean = true
  export let isSub: boolean = true
  export let isAside: boolean = true
  export let isCustomAttr: boolean = true
</script>

<Panel bind:isAside isHeader={$$slots.header || isHeader} bind:panelWidth bind:innerWidth on:close>
  <svelte:fragment slot="title">
    <div class="popupPanel-title__content-container antiTitle">
      {#if $$slots.navigator}
        <div class="buttons-group xsmall-gap mr-4">
          <slot name="navigator" />
        </div>
      {/if}
      {#if $$slots.title}
        <slot name="title" />
      {:else}
        <div class="icon-wrapper">
          {#if icon}<div class="wrapped-icon"><Icon {icon} size={'medium'} /></div>{/if}
          <div class="title-wrapper">
            {#if title}<span class="wrapped-title">{title}</span>{/if}
            {#if subtitle}<span class="wrapped-subtitle">{subtitle}</span>{/if}
          </div>
        </div>
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="utils">
    <Component is={calendar.component.DocReminder} props={{ value: object, title }} />
    <Component is={notification.component.LastViewEditor} props={{ value: object }} />
    {#if $$slots.utils}
      <div class="buttons-divider" />
      <slot name="utils" />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="header">
    {#if $$slots.header}
      <div class="header-row between">
        {#if $$slots.header}<slot name="header" />{/if}
        <div class="buttons-group xsmall-gap ml-4">
          <slot name="tools" />
        </div>
      </div>
    {/if}
    {#if $$slots['custom-attributes'] && isCustomAttr}
      {#if isSub}<div class="header-row"><slot name="custom-attributes" direction="row" /></div>{/if}
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="aside">
    <Scroller>
      <div style="padding: .75rem 1.5rem">
        {#if $$slots.actions}
          <div class="flex-row-center pb-3 bottom-divider">
            <span class="fs-bold w-24 mr-6"><slot name="actions-label" /></span>
            <div class="buttons-group xsmall-gap">
              <slot name="actions" />
            </div>
          </div>
        {/if}
        {#if $$slots['custom-attributes'] && isCustomAttr}
          <slot name="custom-attributes" direction="column" />
        {:else if $$slots.attributes}<slot name="attributes" direction="column" />{/if}
        {#if $$slots.aside}<slot name="aside" />{/if}
      </div>
    </Scroller>
  </svelte:fragment>

  {#if withoutActivity}
    <slot />
  {:else}
    <Scroller>
      <div class="popupPanel-body__main-content py-10 clear-mins">
        <Component is={activity.component.Activity} props={{ object, integrate: true }}>
          <slot />
        </Component>
      </div>
    </Scroller>
  {/if}
</Panel>
