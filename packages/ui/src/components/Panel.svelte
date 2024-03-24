<!--
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte'
  import {
    deviceOptionsStore as deviceInfo,
    Separator,
    defineSeparators,
    resizeObserver,
    Button,
    ButtonGroup,
    Scroller,
    panelSeparators,
    ButtonItem
  } from '../../'
  import IconClose from './icons/Close.svelte'
  import IconDetails from './icons/Details.svelte'
  import IconMaxWidth from './icons/MaxWidth.svelte'
  import IconMinWidth from './icons/MinWidth.svelte'
  import IconScale from './icons/Scale.svelte'
  import IconScaleFull from './icons/ScaleFull.svelte'

  export let innerWidth: number = 0
  export let panelWidth: number = 0
  export let isHeader: boolean = true
  export let isAside: boolean = true
  export let isFullSize: boolean = false
  export let withoutTitle: boolean = false
  export let floatAside: boolean = false
  export let allowClose: boolean = true
  export let embedded: boolean = false
  export let useMaxWidth: boolean | undefined = undefined
  export let customAside: ButtonItem[] | undefined = undefined
  export let selectedAside: string | boolean = customAside ? customAside[0].id : isAside
  export let kind: 'default' | 'modern' = 'default'

  export function getAside (): string | boolean {
    if (customAside) return selectedAside
    return asideShown
  }
  export function setAside (id: string | boolean): void {
    if (typeof id === 'string' && customAside) {
      const i = customAside.findIndex((as) => as.id === id)
      if (i === -1) return
      handleSelectAside({ detail: id })
    } else {
      asideShown = id !== false
      hideAside = !asideShown
      if (id === false) selectedAside = false
    }
  }

  const dispatch = createEventDispatcher()

  let el: HTMLElement
  let asideFloat: boolean = false
  let asideShown: boolean = selectedAside !== false
  let hideAside: boolean = !asideShown
  let fullSize: boolean = false
  let oldAside: string | boolean = selectedAside

  $: if (typeof selectedAside === 'string' && oldAside !== selectedAside) oldAside = selectedAside
  $: setAside(selectedAside)
  $: if (el !== undefined) {
    panelWidth = el.clientWidth
    checkPanel()
  }

  let oldWidth = ''
  let hideTimer: any | undefined

  const checkPanel = (): void => {
    const k = `${panelWidth}-${asideFloat}`
    if (oldWidth === k) {
      return
    }
    oldWidth = k
    if (floatAside) {
      asideFloat = true
    } else if (panelWidth <= 900 && !asideFloat) {
      asideFloat = true
      if (asideShown) {
        asideShown = false
        if (customAside) handleSelectAside({ detail: false }, false)
      }
    } else if (panelWidth > 900) {
      if (asideFloat) asideFloat = false
      if (!asideShown && !hideAside) {
        asideShown = true
        if (customAside) handleSelectAside({ detail: oldAside }, false)
      }
    }
  }

  afterUpdate(() => {
    if (hideTimer) {
      clearTimeout(hideTimer)
    }
    hideTimer = setTimeout(() => {
      checkPanel()
    }, 500)
  })

  onMount(() => dispatch('open'))

  defineSeparators('panel-aside', panelSeparators)

  const handleAside = (): void => {
    asideShown = !asideShown
    hideAside = !asideShown
  }

  const handleSelectAside = (result: { detail: any }, sw: boolean = true): void => {
    selectedAside = result.detail
    if (sw) {
      asideShown = selectedAside !== false
      hideAside = !asideShown
    }
    dispatch('select', result.detail)
  }
</script>

<div
  bind:this={el}
  class="popupPanel panel {kind}"
  class:embedded
  use:resizeObserver={(element) => {
    panelWidth = element.clientWidth
    checkPanel()
  }}
>
  <div class="popupPanel-title" class:indent={allowClose}>
    {#if allowClose}
      <Button
        id={'btnPClose'}
        focusIndex={10001}
        icon={IconClose}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        on:click={() => {
          dispatch('close')
        }}
      />
      <div class="antiHSpacer x2" />
    {/if}
    <div class="popupPanel-title__content">
      {#if !withoutTitle}<slot name="title" />{/if}
    </div>
    <slot name="pre-utils" />
    <div class="flex-row-center ml-3">
      <slot name="utils" />
      {#if $$slots.aside && isAside}
        {#if customAside}
          <ButtonGroup
            items={customAside}
            props={{ kind: 'icon', iconProps: { size: 'medium' } }}
            bind:selected={selectedAside}
            on:select={handleSelectAside}
          />
        {:else}
          <Button
            id={'btnPAside'}
            focusIndex={10008}
            icon={IconDetails}
            iconProps={{ size: 'medium', filled: asideShown }}
            kind={'icon'}
            selected={asideShown}
            on:click={handleAside}
          />
        {/if}
      {/if}
      {#if useMaxWidth !== undefined}
        <Button
          focusIndex={10009}
          icon={useMaxWidth ? IconMaxWidth : IconMinWidth}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          selected={useMaxWidth}
          on:click={() => {
            useMaxWidth = !useMaxWidth
            dispatch('maxWidth', useMaxWidth)
          }}
        />
      {/if}
      {#if isFullSize}
        <Button
          focusIndex={100010}
          icon={fullSize ? IconScale : IconScaleFull}
          iconProps={{ size: 'medium' }}
          kind={'icon'}
          selected={fullSize}
          on:click={() => {
            fullSize = !fullSize
            dispatch('fullsize')
          }}
        />
      {/if}
    </div>
    <slot name="post-utils" />
  </div>
  <div class="popupPanel-body {$deviceInfo.isMobile ? 'mobile' : 'main'}" class:asideShown>
    {#if $deviceInfo.isMobile}
      <Scroller horizontal padding={'.5rem .75rem'}>
        <div
          class="popupPanel-body__mobile"
          use:resizeObserver={(element) => {
            innerWidth = element.clientWidth
          }}
        >
          {#if $$slots.header && isHeader}
            <div class="popupPanel-body__header mobile bottom-divider" class:max={useMaxWidth}>
              <slot name="header" />
            </div>
          {/if}
          <slot />
        </div>
      </Scroller>
    {:else}
      <div
        class="popupPanel-body__main"
        use:resizeObserver={(element) => {
          innerWidth = element.clientWidth
        }}
      >
        {#if $$slots.header && isHeader}
          <div class="popupPanel-body__header-wrapper">
            <div class="popupPanel-body__header main" class:max={useMaxWidth}>
              <slot name="header" />
            </div>
          </div>
        {/if}
        <slot />
      </div>
    {/if}
    {#if $$slots.aside && isAside && asideShown}
      <Separator name={'panel-aside'} float={asideFloat} index={0} />
      <div class="popupPanel-body__aside" class:float={asideFloat} class:shown={asideShown}>
        <Separator name={'panel-aside'} float={asideFloat ? 'aside' : true} index={0} />
        <div class="antiPanel-wrap__content">
          <slot name="aside" />
        </div>
      </div>
    {/if}
  </div>
</div>
