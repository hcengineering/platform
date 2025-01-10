<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  // Note: migrated from QMS. Should be unified with the platform solutions eventually.
  import { createEventDispatcher } from 'svelte'
  import type { IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent, ButtonKind } from '../types'
  import Button from './Button.svelte'
  import Label from './Label.svelte'
  import Scroller from './Scroller.svelte'
  import { resizeObserver } from '../resize'
  import ui from '../plugin'
  import Close from './icons/Close.svelte'
  import Left from './icons/Left.svelte'

  export let label: IntlString
  export let labelProps: any | undefined = undefined
  export let submitLabel: IntlString = ui.string.Submit
  export let submitKind: ButtonKind = 'primary'
  export let cancelLabel: IntlString = ui.string.Cancel
  export let canSubmit: boolean = false
  export let shouldSubmitOnEnter: boolean = false
  export let shouldCloseOnCancel: boolean = true
  export let hasBack: boolean = false
  export let isForm: boolean = true
  export let embedded: boolean = false
  export let width: string | undefined = undefined
  export let isFooterBorderHidden = false
  export let loading = false
  export let noContentPadding = false
  export let scrollableContent = true
  export let withoutFooter = false
  export let closeIcon: AnySvelteComponent = Close
  export let shadow: boolean = false
  export let className: string = ''

  const dispatch = createEventDispatcher()

  function submit (): void {
    dispatch('submit')
  }

  function close (): void {
    dispatch('close')
  }

  function cancel (): void {
    dispatch('cancel')

    if (shouldCloseOnCancel) {
      close()
    }
  }
</script>

<svelte:element
  this={isForm ? 'form' : 'div'}
  class="root {className}"
  class:shadow
  class:embedded
  on:submit|preventDefault={isForm && shouldSubmitOnEnter ? submit : undefined}
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
  style:width
>
  <div class="header">
    <slot name="headerLeft">
      <div class="headerLeft">
        <div class="flex-row-center flex-gap-2">
          {#if hasBack}
            <div class="back">
              <Button
                icon={Left}
                iconProps={{ size: 'small' }}
                size="small"
                kind="ghost"
                label={ui.string.Back}
                on:click={() => dispatch('back')}
              />
            </div>
          {/if}
          <slot name="headerExtra" />
        </div>
        <span class="label"><Label {label} params={labelProps} /></span>
      </div>
    </slot>
    <slot name="headerRight">
      {#if !embedded}
        <Button icon={closeIcon} iconProps={{ size: 'medium' }} kind="ghost" size="small" on:click={close} />
      {/if}
    </slot>
  </div>

  {#if scrollableContent}
    <Scroller>
      <div class="content" class:noPadding={noContentPadding}>
        {#if !noContentPadding}
          <div class="htPadding" />
        {/if}
        <slot />
        {#if !noContentPadding}
          <div class="hbPadding" />
        {/if}
      </div>
    </Scroller>
  {:else}
    <div class="content" class:noPadding={noContentPadding}>
      {#if !noContentPadding}
        <div class="htPadding" />
      {/if}
      <slot />
      {#if !noContentPadding}
        <div class="hbPadding" />
      {/if}
    </div>
  {/if}

  {#if !withoutFooter || $$slots.footerExtra || $$slots.footerButtons || $$slots.btnsXtraStart || $$slots.btnsXtraBetween || $$slots.btnsXtraEnd}
    <div class="footer tweak-buttons" class:footerWithBorder={!isFooterBorderHidden}>
      <slot name="footerExtra">
        <div />
      </slot>

      <div class="footerButtons">
        <slot name="footerButtons">
          <slot name="btnsXtraStart" />
          <Button kind="regular" size="large" label={cancelLabel} on:click={cancel} {loading} />
          <slot name="btnsXtraBetween" />
          <Button
            kind={submitKind}
            size="large"
            label={submitLabel}
            focusIndex={10001}
            disabled={!canSubmit}
            on:click={submit}
            {loading}
          />
          <slot name="btnsXtraEnd" />
        </slot>
      </div>
    </div>
  {/if}
</svelte:element>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 58.25rem;
    max-height: 80vh;
    border-radius: 1.25rem;
    background-color: var(--theme-dialog-background-color);

    &.embedded {
      width: 100%;
      height: 100%;
      max-height: unset;
      border-radius: 0;
    }
  }

  .shadow {
    box-shadow: var(--theme-popup-shadow);
  }

  .header {
    flex: 0 0 auto;
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
    padding: 1.25rem 2rem 0.875rem 2.5rem;
    border-bottom: 1px solid var(--theme-dialog-border-color);
  }

  .headerLeft {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .back {
    :global(button) {
      color: var(--theme-dialog-back-color) !important;
      padding-left: 0 !important;
    }
  }

  .label {
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }

  // we need these elements as paddings because Scroller doesn't respect css padding
  .htPadding {
    width: 100%;
    height: 1.25rem;
  }

  .hbPadding {
    width: 100%;
    height: 2rem;
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: stretch;

    flex: 1 1 auto;
    min-height: 0;
    padding: 0 2.5rem 0 2.5rem;

    &.noPadding {
      padding: 0;
    }
  }

  .footer {
    flex: 0 0 auto;
    height: 4.875rem;
    padding: 1.25rem 2.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &.footerWithBorder {
      border-top: 1px solid var(--theme-dialog-border-color);
    }
  }

  .footerButtons {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.75rem;
  }

  // TODO: remove when supported on the platform
  .tweak-buttons {
    :global(button) {
      min-width: 6.25rem !important;
    }
  }
</style>
