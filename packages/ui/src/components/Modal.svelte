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
  import { createEventDispatcher } from 'svelte'
  import { IntlString } from '@hcengineering/platform'
  import Header from './Header.svelte'
  import Label from './Label.svelte'
  import ButtonIcon from './ButtonIcon.svelte'
  import ButtonBase from './ButtonBase.svelte'
  import Scroller from './Scroller.svelte'
  import ui from '..'

  export let type: 'type-aside' | 'type-popup' | 'type-component'
  export let width: 'large' | 'medium' | 'small' | 'x-small' | 'menu' = 'large'
  export let label: IntlString | undefined = undefined
  export let labelProps: any | undefined = undefined
  export let okAction: () => Promise<void> | void = () => {}
  export let onCancel: (() => void) | undefined = undefined
  export let canSave: boolean = false
  export let okLabel: IntlString = ui.string.Ok
  export let padding: string | undefined = undefined
  export let hidden: boolean = false
  export let allowFullsize: boolean = false
  export let noTopIndent: boolean = false
  export let hideFooter: boolean = false
  export let adaptive: 'default' | 'freezeActions' | 'doubleRow' | 'disabled' = 'disabled'
  export let showCancelButton: boolean = true

  const dispatch = createEventDispatcher()

  function close (): void {
    if (onCancel) onCancel()
    else dispatch('close')
  }
  function onKeyDown (ev: KeyboardEvent) {
    if (ev.key === 'Escape') close()
  }

  $: typePadding =
    type === 'type-popup'
      ? 'var(--spacing-2) var(--spacing-3) var(--spacing-4)'
      : type === 'type-aside'
        ? 'var(--spacing-2) var(--spacing-1_5)'
        : 'var(--spacing-4)'
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="hulyModal-container {type} {width}" class:hidden class:noTopIndent>
  <Header
    {type}
    {allowFullsize}
    {adaptive}
    on:close={close}
    hideBefore={!$$slots.beforeTitle}
    hideActions={!$$slots.actions}
  >
    <svelte:fragment slot="beforeTitle">
      <slot name="beforeTitle" />
    </svelte:fragment>
    {#if label}<Label {label} params={labelProps} />{/if}
    <slot name="title" />
    <svelte:fragment slot="actions">
      <slot name="actions" />
    </svelte:fragment>
  </Header>
  <slot name="beforeContent" />
  <div class="hulyModal-content">
    <Scroller
      padding={padding ?? typePadding}
      bottomPadding={type === 'type-popup'
        ? undefined
        : type === 'type-aside'
          ? 'var(--spacing-2)'
          : 'var(--spacing-4)'}
    >
      <slot />
    </Scroller>
  </div>
  <slot name="afterContent" />
  {#if type !== 'type-component' && !hideFooter}
    <div class="hulyModal-footer">
      <ButtonBase
        type={'type-button'}
        kind={'primary'}
        size={type === 'type-aside' ? 'large' : 'medium'}
        label={okLabel}
        on:click={okAction}
        disabled={!canSave}
      />
      {#if showCancelButton}
        <ButtonBase
          type={'type-button'}
          kind={'secondary'}
          size={type === 'type-aside' ? 'large' : 'medium'}
          label={ui.string.Cancel}
          on:click={onCancel}
        />
      {/if}
      {#if $$slots.buttons}
        <slot name="buttons" />
      {/if}
    </div>
  {/if}
</div>
