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
  import type { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import { resizeObserver, Button, Label, IconClose, IconScale, IconScaleFull } from '..'

  export let label: IntlString | undefined = undefined
  export let isFullSize: boolean = false

  const dispatch = createEventDispatcher()

  let fullSize: boolean = false
</script>

<form
  class="dialog-container"
  class:fullsize={fullSize}
  on:submit|preventDefault={() => {}}
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  <div class="flex-between header">
    <div class="flex-row-center gap-1-5">
      <Button icon={IconClose} kind={'ghost'} size={'medium'} on:click={() => dispatch('close')} />
      <div class="title">
        {#if label}<Label {label} />{/if}
        {#if $$slots.title}<slot name="title" />{/if}
      </div>
    </div>
    <div class="flex-row-center gap-1-5">
      {#if $$slots.utils}
        <slot name="utils" />
      {/if}
      {#if $$slots.utils && isFullSize}
        <div class="buttons-divider" />
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
  <div class="content" class:rounded={!($$slots.footerLeft || $$slots.footerRight)}>
    <slot />
  </div>
  {#if $$slots.footerLeft || $$slots.footerRight}
    <div class="footer">
      {#if $$slots.footerLeft}
        <div class="flex-row-center gap-2">
          <slot name="footerLeft" />
        </div>
      {:else}<div />{/if}
      {#if $$slots.footerRight}
        <div class="flex-row-center gap-2">
          <slot name="footerRight" />
        </div>
      {:else}<div />{/if}
    </div>
  {/if}
</form>

<style lang="scss">
  .dialog-container {
    display: flex;
    flex-direction: column;
    min-width: 25rem;
    max-width: calc(100vw - 2rem);
    min-height: 0;
    max-height: 80vh;
    background-color: var(--theme-popup-color);
    border-radius: 0.5rem;

    &:not(.fullsize) {
      border: 1px solid var(--theme-popup-divider);
      box-shadow: var(--theme-popup-shadow);
    }
    &.fullsize {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
    }

    .header {
      flex-shrink: 0;
      padding: 0.5rem;
      background-color: var(--theme-popup-header);
      border-bottom: 1px solid var(--theme-popup-divider);
      border-radius: 0.5rem 0.5rem 0 0;

      .title {
        flex-grow: 1;
        font-size: 1rem;
        color: var(--theme-caption-color);
      }
    }
    .content {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      min-width: 0;
      min-height: 0;

      &.rounded {
        border-radius: 0 0 0.5rem 0.5rem;
      }
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      padding: 0.25rem 0.5rem;
      border-top: 1px solid var(--theme-popup-divider);
      border-radius: 0 0 0.5rem 0.5rem;
    }
  }
</style>
