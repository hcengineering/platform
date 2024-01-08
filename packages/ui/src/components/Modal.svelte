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
  import IconDelete from './icons/Delete.svelte'
  import IconCopy from './icons/Copy.svelte'
  import ui from '..'

  export let type: 'type-aside' | 'type-component'
  export let label: IntlString
  export let labelProps: any | undefined = undefined
  export let okAction: () => Promise<void> | void
  export let onCancel: (() => void) | undefined = undefined
  export let canSave: boolean = false
  export let okLabel: IntlString = ui.string.Ok

  const dispatch = createEventDispatcher()

  function close (): void {
    if (onCancel) onCancel()
    else dispatch('close')
  }
  function onKeyDown (ev: KeyboardEvent) {
    if (ev.key === 'Escape') close()
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="hulyModal-container {type}">
  <Header {type} on:close={close}>
    <Label {label} params={labelProps} />
    <svelte:fragment slot="actions">
      <ButtonIcon icon={IconDelete} size={'small'} kind={'tertiary'} />
      <ButtonIcon icon={IconCopy} size={'small'} kind={'tertiary'} />
    </svelte:fragment>
  </Header>
  <div class="hulyModal-content">
    <Scroller>
      <slot />
    </Scroller>
  </div>
  {#if type === 'type-aside'}
    <div class="hulyModal-footer">
      <ButtonBase
        type={'type-button'}
        kind={'primary'}
        size={'large'}
        label={okLabel}
        on:click={okAction}
        disabled={!canSave}
      />
      <ButtonBase type={'type-button'} kind={'secondary'} size={'large'} label={ui.string.Cancel} on:click={onCancel} />
    </div>
  {/if}
</div>
