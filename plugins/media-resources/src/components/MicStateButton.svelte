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
  import { Icon, tooltip } from '@hcengineering/ui'

  import media from '../plugin'

  import IconMicOn from './icons/MicOn.svelte'
  import IconMicOff from './icons/MicOff.svelte'
  import { toggleMicState } from '../utils'

  export let state: MicState | undefined
</script>

{#if state != null}
  <button
    class="hulyStatusBarButton mini positive {state.enabled ? 'positiveContent' : 'negativeContent'}"
    use:tooltip={{ label: state.enabled ? media.string.TurnOffMic : media.string.TurnOnMic, direction: 'bottom' }}
    on:click={toggleMicState}
  >
    <Icon icon={state.enabled ? IconMicOn : IconMicOff} size={'small'} />
  </button>
{/if}
