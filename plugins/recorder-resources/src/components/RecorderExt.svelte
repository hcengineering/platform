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
  import { Icon, showPopup } from '@hcengineering/ui'

  import IconRec from './icons/Rec.svelte'
  import IconRecordOn from './icons/RecordOn.svelte'
  import RecordingPopup from './RecordingPopup.svelte'

  import plugin from '../plugin'
  import { recording } from '../stores'

  const endpoint = getMetadata(plugin.metadata.StreamUrl) ?? ''

  function handleClick (): void {
    showPopup(RecordingPopup, {}, 'centered')
  }
</script>

{#if endpoint !== ''}
  {#if $recording !== null}
    <button
      class="antiButton ghost jf-center bs-none no-focus statusButton negative"
      style="padding-left: 0.25rem"
      on:click={handleClick}
    >
      <Icon icon={IconRecordOn} iconProps={{ fill: 'var(--primary-button-color)' }} size="small" />
      <Icon icon={IconRec} iconProps={{ fill: 'var(--primary-button-color)' }} size="small" />
    </button>
  {:else}
    <button
      class="antiButton ghost jf-center bs-none no-focus statusButton"
      style="padding-left: 0.25rem"
      on:click={handleClick}
    >
      <Icon icon={IconRecordOn} iconProps={{ fill: 'var(--theme-dark-color)' }} size="small" />
      <Icon icon={IconRec} iconProps={{ fill: 'var(--theme-dark-color)' }} size="small" />
    </button>
  {/if}
{/if}
