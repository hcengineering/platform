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
  import { enumerateDevices, updateSelectedCamId } from '@hcengineering/media'
  import { Label, Loading } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import media from '../plugin'
  import { camAccess, state, sessions } from '../stores'
  import { getDeviceLabel, getSelectedCam } from '../utils'

  import MediaPopupCamPreview from './MediaPopupCamPreview.svelte'
  import MediaPopupItem from './MediaPopupItem.svelte'
  import IconCamOn from './icons/CamOn.svelte'
  import IconCamOff from './icons/CamOff.svelte'

  export let expanded: boolean = false

  let access: 'granted' | 'denied' | 'prompt' = 'prompt'
  let selected: MediaDeviceInfo | null | undefined = undefined
  let devices: Promise<MediaDeviceInfo[]> | null = null

  async function getDevices (): Promise<MediaDeviceInfo[]> {
    if (devices === null) {
      devices = enumerateDevices('videoinput', access !== 'granted')
    }

    return await devices
  }

  async function handleSelectCam (device: MediaDeviceInfo | null): Promise<void> {
    if (selected?.deviceId === device?.deviceId) return

    const deviceId = device?.deviceId

    updateSelectedCamId(deviceId)
    selected = device

    $sessions.forEach((p) => {
      p.emit('selected-camera', deviceId ?? 'default')
    })
  }

  onMount(async () => {
    selected = await getSelectedCam()
  })

  $: access = $camAccess.state
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
    label={selected == null ? media.string.DefaultCam : getDeviceLabel(selected)}
    icon={selected !== null ? IconCamOn : IconCamOff}
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
      {#await getDevices()}
        <div class="p-4">
          <Loading />
        </div>
      {:then devices}
        {#if devices.length > 0}
          {#each devices as device}
            <MediaPopupItem
              label={getDeviceLabel(device)}
              selected={selected?.deviceId === device.deviceId}
              selectable
              on:select={() => handleSelectCam(device)}
            />
          {/each}

          {#if selected}
            <div class="preview">
              <MediaPopupCamPreview {selected} />
            </div>
          {/if}
        {:else}
          <MediaPopupItem
            label={media.string.NoCam}
            icon={IconCamOff}
            iconProps={{ fill: 'var(--theme-state-negative-color)' }}
            disabled
          />
        {/if}
      {/await}
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

  .preview {
    padding: 0.375rem;
    border-radius: 0.375rem;
    width: 100%;

    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
