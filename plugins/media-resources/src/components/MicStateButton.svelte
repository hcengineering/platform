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
  import { type MicState } from '@hcengineering/media'
  import { Button } from '@hcengineering/ui'

  import media from '../plugin'
  import { sessions } from '../stores'

  import IconMicOn from './icons/MicOn.svelte'

  export let state: MicState | undefined

  function handleClick (): void {
    const enabled = state?.enabled ?? false
    for (const session of $sessions) {
      session.emit('microphone', !enabled)
    }
  }
</script>

{#if state != null}
  <Button
    noFocus
    icon={IconMicOn}
    iconProps={{
      fill: state.enabled ? 'var(--theme-state-positive-color)' : 'var(--theme-state-negative-color)'
    }}
    kind={'icon'}
    size={'x-small'}
    padding={'0 .5rem'}
    showTooltip={{ label: state.enabled ? media.string.TurnOffMic : media.string.TurnOnMic }}
    on:click={handleClick}
  />
{/if}
