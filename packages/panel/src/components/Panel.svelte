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
  import { afterUpdate, createEventDispatcher } from 'svelte'
  import { Writable, writable } from 'svelte/store'

  import activity from '@hcengineering/activity'
  import { Doc } from '@hcengineering/core'
  import { Component, deviceOptionsStore as deviceInfo, Panel, Scroller } from '@hcengineering/ui'
  import type { ButtonItem } from '@hcengineering/ui'

  export let title: string | undefined = undefined
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
  export let floatAside: boolean = false
  export let allowClose: boolean = true
  export let embedded: boolean = false
  export let useMaxWidth: boolean | undefined = undefined
  export let isFullSize: boolean = false
  export let contentClasses: string | undefined = undefined
  export let content: HTMLElement | undefined | null = undefined
  export let withoutContentScroll: boolean = false
  export let customAside: ButtonItem[] | undefined = undefined
  export let selectedAside: string | boolean = customAside ? customAside[0].id : isAside
  export let kind: 'default' | 'modern' = 'default'

  export function getAside (): string | boolean {
    return panel.getAside()
  }
  export function setAside (id: string | boolean): void {
    panel.setAside(id)
  }

  const dispatch = createEventDispatcher()

  let lastHref: string
  let timer: any
  let lastScrollHeight: number = -1
  let count: number = 0
  let panel: Panel

  const waitCount = 10
  const PanelScrollTop: Writable<Record<string, number>> = writable<Record<string, number>>({})

  const startScrollHeightCheck = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (content == null) {
        return
      }
      if (lastScrollHeight <= content?.scrollHeight && count <= waitCount) {
        count = lastScrollHeight < content.scrollHeight ? 0 : count + 1
        lastScrollHeight = content.scrollHeight

        startScrollHeightCheck()
      } else {
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
  bind:this={panel}
  bind:isAside
  {isHeader}
  bind:panelWidth
  bind:innerWidth
  bind:withoutTitle
  on:open
  on:close
  {allowClose}
  {embedded}
  {kind}
  {floatAside}
  bind:useMaxWidth
  {isFullSize}
  {customAside}
  bind:selectedAside
  on:select={(result) => {
    selectedAside = result.detail
    dispatch('select', result.detail)
  }}
>
  <svelte:fragment slot="title">
    {#if !withoutTitle}
      {#if $$slots.title}
        <slot name="title" />
      {:else if title}
        <div class="title not-active">{title}</div>
      {/if}
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="pre-utils">
    <slot name="pre-utils" />
  </svelte:fragment>
  <svelte:fragment slot="utils">
    {#if isUtils && $$slots.utils}
      <slot name="utils" />
      <div class="buttons-divider max-h-7 h-7 mx-2" />
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

  <svelte:fragment slot="post-utils">
    <slot name="post-utils" />
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
  {:else if withoutContentScroll}
    <div
      bind:this={content}
      class={contentClasses ?? 'popupPanel-body__main-content py-8 clear-mins'}
      class:max={useMaxWidth}
    >
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
