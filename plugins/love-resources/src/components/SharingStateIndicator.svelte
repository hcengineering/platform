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
  import { tooltip, eventToHTMLElement, showPopup } from '@hcengineering/ui'

  import love from '../plugin'
  import { isSharingEnabled, isShareWithSound, screenSharing, liveKitClient } from '../utils'

  import SharingStatePopup from './SharingStatePopup.svelte'
  import IconShare from './icons/Share.svelte'
  import { lkSessionConnected } from '../liveKitClient'

  let disabled: boolean = false
  let pressed: boolean = false

  function handleShowPopup (ev: MouseEvent): void {
    pressed = true
    showPopup(SharingStatePopup, {}, eventToHTMLElement(ev), () => {
      pressed = false
    })
  }

  function handleShare (): void {
    if (disabled) return
    void liveKitClient.setScreenShareEnabled(true, $isShareWithSound)
  }

  $: disabled = !$screenSharing && !$lkSessionConnected
</script>

{#if $lkSessionConnected}
  {#if $isSharingEnabled}
    <button
      class="hulyStatusBarButton mini positive positiveContent"
      class:pressed
      use:tooltip={{ label: love.string.Sharing, direction: 'bottom' }}
      on:click={handleShowPopup}
    >
      <IconShare size={'small'} />
    </button>
  {:else}
    <button
      class="hulyStatusBarButton mini disabled"
      class:pressed
      {disabled}
      use:tooltip={{ label: love.string.Share, direction: 'bottom' }}
      on:click={handleShare}
    >
      <IconShare size={'small'} />
    </button>
  {/if}
{/if}
