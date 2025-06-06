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
  import { enumerateDevices, updateSelectedMicId } from '@hcengineering/media'
  import { Label, Loading } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import media from '../plugin'
  import { micAccess, state, sessions } from '../stores'
  import { getDeviceLabel, getSelectedMic } from '../utils'

  import MediaPopupItem from './MediaPopupItem.svelte'
  import IconMicOn from './icons/MicOn.svelte'
  import IconMicOff from './icons/MicOff.svelte'

  export let expanded: boolean = false

  let access: 'granted' | 'denied' | 'prompt' = 'prompt'
  let selected: MediaDeviceInfo | null | undefined = undefined
  let devices: Promise<MediaDeviceInfo[]> | null = null

  async function getDevices (): Promise<MediaDeviceInfo[]> {
    if (devices === null) {
      devices = enumerateDevices('audioinput', access !== 'granted')
    }

    return await devices
  }

  async function handleSelectMic (device: MediaDeviceInfo | null): Promise<void> {
    if (selected?.deviceId === device?.deviceId) return

    const deviceId = device?.deviceId

    updateSelectedMicId(deviceId)
    selected = device

    $sessions.forEach((p) => {
      p.emit('selected-microphone', deviceId ?? 'default')
    })
  }

  onMount(async () => {
    selected = await getSelectedMic()
  })

  $: access = $micAccess.state
</script>

{#if access === 'denied'}
  <MediaPopupItem
    label={media.string.NoMic}
    icon={IconMicOff}
    iconProps={{ fill: 'var(--theme-state-negative-color)' }}
    disabled
  />
{:else}
  <MediaPopupItem
    label={selected == null ? media.string.DefaultMic : getDeviceLabel(selected)}
    icon={selected !== null ? IconMicOn : IconMicOff}
    expandable={true}
    {expanded}
    on:expand
  >
    <div slot="subtitle">
      {#if $state.microphone !== undefined}
        {@const enabled = $state.microphone.enabled}
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
              on:select={() => handleSelectMic(device)}
            />
          {/each}
        {:else}
          <MediaPopupItem
            label={media.string.NoMic}
            icon={IconMicOff}
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
</style>
