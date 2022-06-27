<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { resizeObserver } from '../resize'
  import Button from './Button.svelte'
  import IconClose from './icons/Close.svelte'
  import IconDetails from './icons/Details.svelte'
  import IconScale from './icons/Scale.svelte'
  import IconScaleFull from './icons/ScaleFull.svelte'

  export let innerWidth: number = 0
  export let panelWidth: number = 0
  export let isHeader: boolean = true
  export let isAside: boolean = true
  export let isFullSize: boolean = false

  const dispatch = createEventDispatcher()

  let asideFloat: boolean = false
  let asideShown: boolean = false
  $: if (panelWidth < 900 && !asideFloat) asideFloat = true
  $: if (panelWidth >= 900 && asideFloat) {
    asideFloat = false
    asideShown = false
  }
  let docWidth: number
  let fullSize: boolean = false
  let docSize: boolean = false
  $: if (docWidth <= 900 && !docSize) docSize = true
  $: if (docWidth > 900 && docSize) docSize = false
</script>

<svelte:window bind:innerWidth={docWidth} />
<div
  class="popupPanel"
  use:resizeObserver={(element) => {
    panelWidth = element.clientWidth
  }}
>
  <div class="popupPanel-title">
    <Button
      icon={IconClose}
      kind={'transparent'}
      size={'medium'}
      on:click={() => {
        dispatch('close')
      }}
    />
    <div class="popupPanel-title__content"><slot name="title" /></div>
    <div class="buttons-group xsmall-gap">
      <slot name="utils" />
      {#if isFullSize || (asideFloat && $$slots.aside && isAside)}<div class="buttons-divider" />{/if}
      {#if asideFloat && $$slots.aside && isAside}
        <Button
          icon={IconDetails}
          kind={'transparent'}
          size={'medium'}
          selected={asideShown}
          on:click={() => {
            asideShown = !asideShown
          }}
        />
      {/if}
      {#if isFullSize}
        <Button
          icon={fullSize || docWidth <= 900 ? IconScale : IconScaleFull}
          kind={'transparent'}
          size={'medium'}
          selected={fullSize}
          disabled={docWidth <= 900}
          on:click={() => {
            fullSize = !fullSize
            dispatch('fullsize')
          }}
        />
      {/if}
    </div>
  </div>
  <div class="popupPanel-body" class:asideShown>
    <div
      class="popupPanel-body__main"
      use:resizeObserver={(element) => {
        innerWidth = element.clientWidth
      }}
    >
      {#if $$slots.header && isHeader}
        <div class="popupPanel-body__main-header bottom-divider">
          <slot name="header" />
        </div>
      {/if}
      <slot />
    </div>
    {#if $$slots.aside && isAside}
      <div class="popupPanel-body__aside" class:float={asideFloat} class:shown={asideShown}>
        <slot name="aside" />
      </div>
    {/if}
  </div>
</div>
