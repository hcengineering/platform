<!--
    // Copyright © 2020, 2021 Anticrm Platform Contributors.
    // Copyright © 2021, 2023 Hardcore Engineering Inc.
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
  import { afterUpdate } from 'svelte'
  import { Writable, writable } from 'svelte/store'

  import activity from '@hcengineering/activity'
  import calendar from '@hcengineering/calendar'
  import { Doc } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
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
  export let isReminder: boolean = true
  export let floatAside = false
  export let allowBack = true
  export let allowClose = true
  export let useMaxWidth: boolean | undefined = undefined
  export let isFullSize = false
  export let embedded = false
  export let contentClasses: string | undefined = undefined
  export let content: HTMLElement | undefined = undefined

  let lastHref: string
  let timer: any
  let lastScrollHeight: number = -1
  let count: number = 0

  const waitCount = 10
  const PanelScrollTop: Writable<Record<string, number>> = writable<Record<string, number>>({})

  const startScrollHeightCheck = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (scroll == null) {
        return
      }
      if (content !== undefined && lastScrollHeight <= content?.scrollHeight && count <= waitCount) {
        count = lastScrollHeight < content.scrollHeight ? 0 : count + 1
        lastScrollHeight = content.scrollHeight

        startScrollHeightCheck()
      } else if (content !== undefined) {
        lastScrollHeight = -1
        count = 0

        content.scrollTop = $PanelScrollTop[window.location.href]
        $PanelScrollTop[window.location.href] = 0
        lastHref = window.location.href
      }
    }, 50)
  }

  afterUpdate(() => {
    if (lastHref !== window.location.href) {
      startScrollHeightCheck()
    }
  })
</script>

<Panel
  bind:isAside
  {isHeader}
  bind:panelWidth
  bind:innerWidth
  bind:withoutTitle
  on:open
  on:close
  {allowBack}
  {allowClose}
  {floatAside}
  {embedded}
  bind:useMaxWidth
  {isFullSize}
>
  <svelte:fragment slot="navigator">
    {#if $$slots.navigator}
      <div class="flex-row-center flex-gap-1-5 mx-2">
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
    <slot name="pre-utils" />
    {#if isReminder}
      <Component is={calendar.component.DocReminder} props={{ value: object, title, focusIndex: 9000 }} />
    {/if}
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
    {#if $$slots['aside-tabs']}
      <div class="popupPanel-body__aside-tabsheader">
        <slot name="aside-tabs" />
      </div>
    {/if}
    {#if $$slots.actions}
      <div class="popupPanel-body__aside-header">
        {#if $$slots['actions-label']}
          <span class="fs-bold w-27 mr-4"><slot name="actions-label" /></span>
        {:else if $$slots.actions}
          <span class="fs-bold w-27 mr-4" />
        {/if}
        <div class="buttons-group xsmall-gap">
          <slot name="actions" />
        </div>
      </div>
    {/if}
    <Scroller>
      {#if $$slots['custom-attributes'] && isCustomAttr}
        <slot name="custom-attributes" direction="column" />
      {:else if $$slots.attributes}<slot name="attributes" direction="column" />{/if}
      {#if $$slots.aside}<slot name="aside" />{/if}
      <div class="space-divider bottom" />
    </Scroller>
  </svelte:fragment>

  {#if $deviceInfo.isMobile}
    <div bind:this={content} class="popupPanel-body__mobile-content clear-mins" class:max={useMaxWidth}>
      <slot />
      {#if !withoutActivity}
        {#key object._id}
          <Component
            is={activity.component.Activity}
            props={{ object, showCommenInput: !withoutInput, shouldScroll: embedded, focusIndex: 1000 }}
          />
        {/key}
      {/if}
    </div>
  {:else}
    <Scroller
      bind:divScroll={content}
      on:divScrollTop={(event) => {
        if (lastHref === window.location.href && event && event.detail !== $PanelScrollTop[lastHref]) {
          $PanelScrollTop[lastHref] = event.detail
        }
      }}
    >
      <div class={contentClasses ?? 'popupPanel-body__main-content py-8 clear-mins'} class:max={useMaxWidth}>
        <slot />
        {#if !withoutActivity}
          {#key object._id}
            <Component
              is={activity.component.Activity}
              props={{
                object,
                showCommenInput: !withoutInput,
                shouldScroll: embedded,
                focusIndex: 1000,
                boundary: content
              }}
            />
          {/key}
        {/if}
      </div>
    </Scroller>
  {/if}
</Panel>
