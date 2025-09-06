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
  import { ComponentExtensions } from '@hcengineering/presentation'

  import media from '../plugin'

  import MediaPopupCamSelector from './MediaPopupCamSelector.svelte'
  import MediaPopupMicSelector from './MediaPopupMicSelector.svelte'
  import MediaPopupSpkSelector from './MediaPopupSpkSelector.svelte'
  import { getMediaDevices } from '@hcengineering/media'
  import { Loading } from '@hcengineering/ui'

  let micOpened = false
  let camOpened = false
  let spkOpened = false

  function handleMicExpanded (ev: CustomEvent<boolean>): void {
    micOpened = ev.detail
    if (micOpened) {
      camOpened = false
      spkOpened = false
    }
  }

  function handleCamExpanded (ev: CustomEvent<boolean>): void {
    camOpened = ev.detail
    if (camOpened) {
      micOpened = false
      spkOpened = false
    }
  }

  function handleSpkExpanded (ev: CustomEvent<boolean>): void {
    spkOpened = ev.detail
    if (spkOpened) {
      micOpened = false
      camOpened = false
    }
  }
</script>

<div class="antiPopup mediaPopup">
  <ComponentExtensions extension={media.extension.StateContext} on:close />
  {#await getMediaDevices(true, true)}
    <div class="p-4">
      <Loading />
    </div>
  {:then mediaInfo}
    <div class="ap-scroll">
      <div class="ap-box">
        <MediaPopupMicSelector {mediaInfo} bind:expanded={micOpened} on:expand={handleMicExpanded} />
        <div class="separator" />
        <MediaPopupSpkSelector {mediaInfo} bind:expanded={spkOpened} on:expand={handleSpkExpanded} />
        <div class="separator" />
        <MediaPopupCamSelector {mediaInfo} bind:expanded={camOpened} on:expand={handleCamExpanded} />
      </div>
    </div>
  {/await}
</div>

<style lang="scss">
  .mediaPopup {
    width: 20rem;
  }

  .separator {
    border-top: 1px solid var(--theme-divider-color);
    width: 100%;
  }
</style>
