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
  import { Icon } from '@hcengineering/ui'

  import IconRec from './icons/Rec.svelte'

  import plugin from '../plugin'
  import { stopRecording } from '../recording'
  import { recording } from '../stores/recording'

  const endpoint = getMetadata(plugin.metadata.StreamUrl) ?? ''

  function handleClick (): void {
    void stopRecording()
  }
</script>

{#if endpoint !== ''}
  {#if $recording !== null && $recording.state === 'recording'}
    <button
      class="antiButton ghost jf-center bs-none no-focus statusButton negative"
      style="padding-left: 0.25rem"
      on:click={handleClick}
    >
      <div class="dot pulse" />
      <Icon icon={IconRec} iconProps={{ fill: 'var(--primary-button-color)' }} size="small" />
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

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
</style>
