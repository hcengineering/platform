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
  import { MediaInfo, updateSelectedCamId } from '@hcengineering/media'
  import { Label } from '@hcengineering/ui'

  import media from '../plugin'
  import { camAccess, state, sessions } from '../stores'
  import { getDeviceLabel } from '../utils'

  import MediaPopupCamPreview from './MediaPopupCamPreview.svelte'
  import MediaPopupItem from './MediaPopupItem.svelte'
  import IconCamOn from './icons/CamOn.svelte'
  import IconCamOff from './icons/CamOff.svelte'

  export let mediaInfo: MediaInfo
  export let expanded: boolean = false

  let access: 'granted' | 'denied' | 'prompt' = 'prompt'

  $: access = $camAccess.state
  $: devices = mediaInfo.devices.filter((device) => device.kind === 'videoinput')

  async function handleSelectCam (device: MediaDeviceInfo | null): Promise<void> {
    if (device == null || mediaInfo === undefined) return
    if (mediaInfo.activeCamera?.deviceId === device?.deviceId) return
    const deviceId = device?.deviceId
    updateSelectedCamId(deviceId)
    mediaInfo.activeCamera = device

    $sessions.forEach((p) => {
      p.emit('selected-camera', deviceId ?? 'default')
    })
  }
</script>

{#if access === 'denied'}
  <MediaPopupItem
    label={media.string.NoCam}
    icon={IconCamOff}
    iconProps={{ fill: 'var(--theme-state-negative-color)' }}
    disabled
  />
{:else}
  <MediaPopupItem
    label={mediaInfo.activeCamera === undefined ? media.string.DefaultCam : getDeviceLabel(mediaInfo.activeCamera)}
    icon={mediaInfo.activeCamera !== undefined ? IconCamOn : IconCamOff}
    expandable={true}
    {expanded}
    on:expand
  >
    <div slot="subtitle">
      {#if $state.camera !== undefined}
        {@const enabled = $state.camera.enabled}
        <div class="status label overflow-label font-medium" class:enabled>
          <Label label={enabled ? media.string.On : media.string.Off} />
        </div>
      {/if}
    </div>

    <div slot="content">
      {#if devices.length > 0}
        {#each devices as device}
          <MediaPopupItem
            label={getDeviceLabel(device)}
            selected={mediaInfo.activeCamera === device}
            selectable
            on:select={() => handleSelectCam(device)}
          />
        {/each}

        {#if mediaInfo.activeCamera}
          <MediaPopupCamPreview selected={mediaInfo.activeCamera} />
        {/if}
      {:else}
        <MediaPopupItem
          label={media.string.NoCam}
          icon={IconCamOff}
          iconProps={{ fill: 'var(--theme-state-negative-color)' }}
          disabled
        />
      {/if}
    </div>
  </MediaPopupItem>
{/if}

<style lang="scss">
  .status {
    color: var(--theme-state-negative-color);

    &.enabled {
      color: var(--theme-state-positive-color);
    }
  }
</style>
