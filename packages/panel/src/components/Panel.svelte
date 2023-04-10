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
  import activity from '@hcengineering/activity'
  import calendar from '@hcengineering/calendar'
  import type { Doc } from '@hcengineering/core'
  import type { Asset } from '@hcengineering/platform'
  import {
    AnySvelteComponent,
    Component,
    deviceOptionsStore as deviceInfo,
    Icon,
    Panel,
    Scroller
  } from '@hcengineering/ui'

  export let title: string | undefined = undefined
  export let subtitle: string | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let withoutActivity: boolean = false
  export let withoutInput: boolean = false
  export let withoutTitle: boolean = false
  export let object: Doc
  export let panelWidth: number = 0
  export let innerWidth: number = 0
  export let isHeader: boolean = true
  export let isSub: boolean = true
  export let isAside: boolean = true
  export let isUtils: boolean = true
  export let isCustomAttr: boolean = true
  export let floatAside = false
  export let allowClose = true
  export let useMaxWidth: boolean | undefined = undefined
  export let isFullSize = false
  export let embedded = false
</script>

<Panel
  bind:isAside
  isHeader={$$slots.header || isHeader}
  bind:panelWidth
  bind:innerWidth
  bind:withoutTitle
  on:close
  {allowClose}
  {floatAside}
  {embedded}
  bind:useMaxWidth
  {isFullSize}
>
  <svelte:fragment slot="navigator">
    {#if $$slots.navigator}
      <div class="buttons-group xsmall-gap mx-2">
        <slot name="navigator" />
      </div>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="title">
    {#if !withoutTitle}
      <div class="popupPanel-title__content-container antiTitle">
        {#if $$slots.title}
          <slot name="title" />
        {:else}
          <div class="icon-wrapper">
            {#if icon}<div class="wrapped-icon"><Icon {icon} size={'medium'} /></div>{/if}
            <div class="title-wrapper">
              {#if title}<span class="wrapped-title">{title}</span>{/if}
              {#if subtitle || $$slots.subtitle}
                <span class="wrapped-subtitle">
                  {#if subtitle}
                    {subtitle}
                  {/if}
                  <slot name="subtitle" />
                </span>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="utils">
    <Component is={calendar.component.DocReminder} props={{ value: object, title }} />
    {#if isUtils && $$slots.utils}
      <div class="buttons-divider" />
      <slot name="utils" />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="header">
    {#if $$slots.header}
      <div class="header-row between">
        {#if $$slots.header}<slot name="header" />{/if}
        <div class="buttons-group xsmall-gap ml-4" style:align-self={'flex-start'}>
          <slot name="tools" />
        </div>
      </div>
    {/if}
    {#if $$slots['custom-attributes'] && isCustomAttr}
      {#if isSub}<div class="header-row"><slot name="custom-attributes" direction="row" /></div>{/if}
    {/if}
    {#if $$slots.subheader}
      <slot name="subheader" />
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="aside">
    <Scroller padding={'.75rem 1.5rem'}>
      {#if $$slots.actions}
        <div class="flex-row-center pb-3 bottom-divider">
          {#if $$slots['actions-label']}
            <span class="fs-bold w-24 mr-6"><slot name="actions-label" /></span>
          {/if}
          <div class="buttons-group xsmall-gap flex flex-grow">
            <slot name="actions" />
          </div>
        </div>
      {/if}
      {#if $$slots['custom-attributes'] && isCustomAttr}
        <slot name="custom-attributes" direction="column" />
      {:else if $$slots.attributes}<slot name="attributes" direction="column" />{/if}
      {#if $$slots.aside}<slot name="aside" />{/if}
    </Scroller>
    <div class="h-2 min-h-2 max-h-2" />
  </svelte:fragment>

  {#if $deviceInfo.isMobile}
    <div class="popupPanel-body__mobile-content clear-mins" class:max={useMaxWidth}>
      <slot />
      {#if !withoutActivity}
        <Component is={activity.component.Activity} props={{ object, showCommenInput: !withoutInput }} />
      {/if}
    </div>
  {:else}
    <Scroller>
      <div class="popupPanel-body__main-content py-8 clear-mins" class:max={useMaxWidth}>
        <slot />
        {#if !withoutActivity}
          <Component is={activity.component.Activity} props={{ object, showCommenInput: !withoutInput }} />
        {/if}
      </div>
    </Scroller>
  {/if}
</Panel>
