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
  import { MediaInfo, updateSelectedMicId } from '@hcengineering/media'
  import { Label } from '@hcengineering/ui'

  import media from '../plugin'
  import { micAccess, state, sessions } from '../stores'
  import { getDeviceLabel } from '../utils'

  import MediaPopupItem from './MediaPopupItem.svelte'
  import IconMicOn from './icons/MicOn.svelte'
  import IconMicOff from './icons/MicOff.svelte'

  export let mediaInfo: MediaInfo
  export let expanded: boolean = false

  $: access = $micAccess.state
  $: devices = mediaInfo.devices.filter((device) => device.kind === 'audioinput')

  async function handleSelectMic (device: MediaDeviceInfo | null): Promise<void> {
    if (device == null || mediaInfo === undefined) return
    if (mediaInfo.activeMicrophone?.deviceId === device?.deviceId) return
    const deviceId = device?.deviceId
    updateSelectedMicId(deviceId)
    mediaInfo.activeMicrophone = device

    $sessions.forEach((p) => {
      p.emit('selected-microphone', deviceId ?? 'default')
    })
  }
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
    label={mediaInfo.activeMicrophone === undefined
      ? media.string.DefaultMic
      : getDeviceLabel(mediaInfo.activeMicrophone)}
    icon={mediaInfo.activeMicrophone !== undefined ? IconMicOn : IconMicOff}
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
      {#if devices.length > 0}
        {#each devices as device}
          <MediaPopupItem
            label={getDeviceLabel(device)}
            selected={mediaInfo.activeMicrophone === device}
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
