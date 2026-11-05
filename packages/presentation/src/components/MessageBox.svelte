<!--
// Copyright © 2020 Anticrm Platform Contributors.
// Copyright © 2026 TraceX SAS.
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
  import { setPlatformStatus, translate, unknownError, type IntlString } from '@hcengineering/platform'
  import { Button, EditBox, FocusHandler, Label, createFocusManager, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation, { HTMLViewer } from '..'

  export let label: IntlString
  export let labelProps: Record<string, any> | undefined = undefined
  export let labelStr: string | undefined = undefined
  export let message: IntlString
  export let richMessage: boolean = false
  export let params: Record<string, any> = {}
  export let okLabel: IntlString | undefined = undefined
  export let dangerous: boolean = false
  export let canSubmit = true
  export let action: (() => Promise<void>) | undefined = undefined
  export let confirmationValue: string | undefined = undefined
  export let confirmationLabel: IntlString | undefined = undefined

  const dispatch = createEventDispatcher()
  let processing = false
  let confirmationInput = ''

  $: confirmed =
    confirmationValue === undefined || (confirmationValue !== '' && confirmationInput.trim() === confirmationValue)

  const manager = createFocusManager()

  async function confirm (): Promise<void> {
    if (processing || !confirmed) return
    processing = true
    try {
      if (action !== undefined) await action()
      dispatch('close', true)
    } catch (error) {
      await setPlatformStatus(unknownError(error))
    } finally {
      processing = false
    }
  }

  function onKeyDown (ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      ev.preventDefault()
      ev.stopPropagation()

      dispatch('close', false)
    }
  }
</script>

<FocusHandler {manager} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="msgbox-container" on:keydown={onKeyDown}>
  <div class="overflow-label fs-title mb-4">
    {#if labelStr !== undefined}
      {labelStr}
    {:else}
      <Label {label} params={labelProps ?? {}} />
    {/if}
  </div>
  <div class="message">
    {#if richMessage}
      {#await translate(message, params) then msg}
        <HTMLViewer value={msg} />
      {/await}
    {:else}
      <Label label={message} {params} />
    {/if}
  </div>
  {#if confirmationValue !== undefined}
    <div class="flex-col flex-gap-2 mb-4">
      {#if confirmationLabel !== undefined}
        <div class="select-text">
          {#await translate(confirmationLabel, { value: '{value}' }, $themeStore.language) then prompt}
            {#each prompt.split('{value}') as part, index}
              {#if index > 0}<strong>{confirmationValue}</strong>{/if}{part}
            {/each}
          {/await}
        </div>
      {/if}
      <EditBox bind:value={confirmationInput} kind="default" focusable focusIndex={0} disabled={processing} autoFocus />
    </div>
  {/if}
  <div class="footer">
    <Button
      focus={!dangerous}
      focusIndex={1}
      label={okLabel ?? presentation.string.Ok}
      size={'large'}
      kind={dangerous ? 'dangerous' : 'primary'}
      loading={processing}
      disabled={processing || !confirmed}
      on:click={confirm}
    />
    {#if canSubmit}
      <Button
        focusIndex={2}
        label={presentation.string.Cancel}
        size={'large'}
        on:click={() => {
          dispatch('close', false)
        }}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .msgbox-container {
    display: flex;
    flex-direction: column;
    padding: 2rem 1.75rem 1.75rem;
    width: 30rem;
    max-width: 40rem;
    background: var(--theme-popup-color);
    border-radius: 0.5rem;
    -webkit-user-select: none;
    user-select: none;
    box-shadow: var(--theme-popup-shadow);

    @media screen and (max-width: 480px) {
      width: 100%;
      max-width: 100%;
    }

    .message {
      margin-bottom: 1.75rem;
      color: var(--theme-content-color);
    }
    .footer {
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: flex-start;
      align-items: center;
      column-gap: 0.5rem;
      // mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0) 1.25rem, rgba(0, 0, 0, 1) 2.5rem);
      // overflow: hidden;
    }
  }
</style>
