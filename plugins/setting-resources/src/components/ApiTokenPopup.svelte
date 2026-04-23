<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Timestamp } from '@hcengineering/core'
  import presentation, { copyTextToClipboard } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import { Button, Label, ticker } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import settings from '../plugin'

  export let token: string

  const isSecureContext = window.isSecureContext
  const dispatch = createEventDispatcher()

  let copiedTime: Timestamp | undefined
  let copied = false

  $: if (copiedTime !== undefined && copied && $ticker - copiedTime > 1000) {
    copied = false
  }

  async function copy (): Promise<void> {
    if (!isSecureContext) return
    if (token === undefined) return

    await copyTextToClipboard(token)
    copied = true
    copiedTime = Date.now()
  }
</script>

<div class="antiPopup popup" class:secure={isSecureContext}>
  <div class="overflow-label fs-title mb-4">
    <Label label={settings.string.ApiToken} />
  </div>

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="token" class:notSecure={!isSecureContext} class:over-underline={isSecureContext} on:click={copy}>
    {token}
  </div>

  <div class="buttons">
    <Button
      label={presentation.string.Close}
      size={'medium'}
      kind={'primary'}
      on:click={() => {
        dispatch('close')
      }}
    />
    {#if isSecureContext}
      <Button label={copied ? view.string.Copied : view.string.CopyToClipboard} size={'medium'} on:click={copy} />
    {/if}
  </div>
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1.75rem;
    width: 30rem;
    max-width: 40rem;
    background: var(--popup-bg-color);
    border-radius: 1.25rem;
    user-select: none;
    box-shadow: var(--popup-shadow);

    .token {
      margin: 1.75rem 0 0;
      overflow-wrap: break-word;

      &.notSecure {
        user-select: text;
      }
    }

    .buttons {
      margin-top: 1.75rem;
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: flex-start;
      align-items: center;
      column-gap: 0.5rem;
    }
  }
</style>
