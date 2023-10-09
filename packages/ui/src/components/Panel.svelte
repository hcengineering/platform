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
    checkAdaptiveMatching,
    IconBack,
    Separator,
    defineSeparators,
    resizeObserver,
    Button,
    Scroller,
    panelSeparators
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
  export let floatAside = false
  export let allowBack = true
  export let allowClose = true
  export let useMaxWidth: boolean | undefined = undefined
  export let embedded = false

  const dispatch = createEventDispatcher()

  let asideFloat: boolean = false
  let asideShown: boolean = true
  let fullSize: boolean = false

  $: devSize = $deviceInfo.size
  $: twoRows = checkAdaptiveMatching(devSize, 'xs')
  $: moveUtils = checkAdaptiveMatching(devSize, 'sm')

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
      }
    } else if (panelWidth > 900) {
      if (asideFloat) {
        asideFloat = false
      }
      if (!asideShown) {
        asideShown = true
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
</script>

<div
  class="popupPanel panel"
  class:embedded
  use:resizeObserver={(element) => {
    panelWidth = element.clientWidth
    checkPanel()
  }}
>
  <div
    class="popupPanel-title__bordered {twoRows && !withoutTitle ? 'flex-col flex-no-shrink' : 'flex-row-center'}"
    class:embedded
  >
    <div class="popupPanel-title {twoRows && !withoutTitle ? 'row-top' : 'row'}">
      {#if allowBack}
        <Button
          focusIndex={10000}
          icon={IconBack}
          kind={'ghost'}
          size={'medium'}
          on:click={() => {
            history.back()
          }}
        />
      {/if}
      {#if allowClose}
        <div class="antiHSpacer" />
        <Button
          focusIndex={10001}
          icon={IconClose}
          kind={'ghost'}
          size={'medium'}
          on:click={() => {
            dispatch('close')
          }}
        />
      {/if}
      {#if $$slots.navigator}<slot name="navigator" />{/if}
      <div class="popupPanel-title__content">
        {#if !twoRows && !withoutTitle}<slot name="title" />{/if}
      </div>
      <div class="buttons-group xsmall-gap">
        {#if !moveUtils}
          <slot name="utils" />
        {/if}
        {#if isFullSize || useMaxWidth !== undefined || ($$slots.aside && isAside)}
          <div class="buttons-divider" />
        {/if}
        {#if $$slots.aside && isAside}
          <Button
            focusIndex={10008}
            icon={IconDetails}
            kind={'ghost'}
            size={'medium'}
            selected={asideShown}
            on:click={() => {
              asideShown = !asideShown
            }}
          />
        {/if}
        {#if useMaxWidth !== undefined}
          <Button
            focusIndex={10009}
            icon={useMaxWidth ? IconMaxWidth : IconMinWidth}
            kind={'ghost'}
            size={'medium'}
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
            kind={'ghost'}
            size={'medium'}
            selected={fullSize}
            on:click={() => {
              fullSize = !fullSize
              dispatch('fullsize')
            }}
          />
        {/if}
      </div>
    </div>
    {#if twoRows && !withoutTitle}
      <div class="popupPanel-title row-bottom"><slot name="title" /></div>
    {/if}
  </div>
  <div class="popupPanel-body {$deviceInfo.isMobile ? 'mobile' : 'main'}" class:asideShown class:embedded>
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
      <Separator name={'panel-aside'} index={0} />
      <div class="popupPanel-body__aside" class:float={asideFloat} class:shown={asideShown}>
        {#if moveUtils}
          <div class="buttons-group justify-end xsmall-gap" style:margin={'.5rem 2rem 0'}>
            <slot name="utils" />
          </div>
        {/if}
        <slot name="aside" />
      </div>
    {/if}
  </div>
</div>
