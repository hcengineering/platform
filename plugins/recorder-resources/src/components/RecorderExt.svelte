<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getMetadata } from '@hcengineering/platform'
  import { Icon, tooltip } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  import IconRec from './icons/Rec.svelte'
  import IconRecordOn from './icons/RecordOn.svelte'

  import plugin from '../plugin'
  import { cancelRecording, recorderState, record, stopRecording } from '../recording'
  import { formatElapsedTime } from '../utils'

  const endpoint = getMetadata(plugin.metadata.StreamUrl) ?? ''

  $: state = $recorderState.state
  $: elapsedTime = $recorderState.elapsedTime

  function handleRecClick (): void {
    void record({})
  }

  onDestroy(async (): Promise<void> => {
    await cancelRecording()
  })
</script>

{#if endpoint !== ''}
  {#if state !== 'stopped' && state !== 'idle' && state !== 'ready'}
    <button
      class="antiButton ghost jf-center bs-none no-focus statusButton negative"
      style="padding-left: 0.25rem"
      use:tooltip={{ label: plugin.string.Stop, direction: 'bottom' }}
      on:click={stopRecording}
    >
      <div class="dot pulse" />
      <div class="timer">
        {formatElapsedTime(elapsedTime)}
      </div>
    </button>
  {:else}
    <button
      class="antiButton ghost jf-center bs-none no-focus statusButton"
      style="padding-left: 0.25rem"
      on:click={handleRecClick}
    >
      <Icon icon={IconRecordOn} iconProps={{ fill: 'var(--theme-dark-color)' }} size="small" />
      <Icon icon={IconRec} iconProps={{ fill: 'var(--theme-dark-color)' }} size="small" />
    </button>
  {/if}
{/if}

<style lang="scss">
  .dot {
    width: 0.5rem;
    height: 0.5rem;
    margin: 0.25rem;
    border-radius: 50%;
    background: var(--primary-button-color);
  }

  .pulse {
    animation: pulse 2s infinite;
  }

  .timer {
    margin-left: 0.125rem;
  }

  @keyframes pulse {
    50% {
      opacity: 0;
    }
  }
</style>
