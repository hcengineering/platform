<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Button, FocusHandler, Label, createFocusManager } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'

  export let label: IntlString
  export let labelProps: IntlString
  export let message: IntlString
  export let params: Record<string, any> = {}
  export let okLabel: IntlString | undefined = undefined
  export let canSubmit = true
  export let action: (() => Promise<void>) | undefined = undefined

  const dispatch = createEventDispatcher()
  let processing = false

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<div class="msgbox-container">
  <div class="overflow-label fs-title mb-4"><Label {label} params={labelProps ?? {}} /></div>
  <div class="message"><Label label={message} {params} /></div>
  <div class="footer">
    <Button
      focus
      focusIndex={1}
      label={okLabel ?? presentation.string.Ok}
      size={'large'}
      kind={'accented'}
      loading={processing}
      on:click={() => {
        processing = true
        if (action !== undefined) {
          action().then(() => {
            processing = false
            dispatch('close', true)
          })
        } else {
          dispatch('close', true)
          processing = false
        }
      }}
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
    user-select: none;
    box-shadow: var(--theme-popup-shadow);

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
