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
  import { MediaInfo, updateSelectedSpeakerId } from '@hcengineering/media'

  import media from '../plugin'
  import { micAccess, sessions } from '../stores'
  import { getDeviceLabel } from '../utils'

  import MediaPopupItem from './MediaPopupItem.svelte'
  import IconSpkOn from './icons/Speaker.svelte'
  import IconSpkOff from './icons/Speaker.svelte'

  export let mediaInfo: MediaInfo
  export let expanded: boolean = false

  $: access = $micAccess.state
  $: devices = mediaInfo.devices.filter((device) => device.kind === 'audiooutput')

  async function handleSelectSpk (device: MediaDeviceInfo | null): Promise<void> {
    if (device == null) return
    if (mediaInfo.activeSpeaker?.deviceId === device?.deviceId) return
    const deviceId = device?.deviceId
    updateSelectedSpeakerId(deviceId)
    mediaInfo.activeSpeaker = device

    $sessions.forEach((p) => {
      p.emit('selected-speaker', deviceId ?? 'default')
    })
  }
</script>

<MediaPopupItem
  label={mediaInfo.activeSpeaker === undefined ? media.string.DefaultSpeaker : getDeviceLabel(mediaInfo.activeSpeaker)}
  icon={mediaInfo.activeSpeaker !== undefined ? IconSpkOn : IconSpkOff}
  disabled={access === 'denied'}
  expandable={true}
  {expanded}
  on:expand
>
  <div slot="content">
    {#if devices.length > 0}
      {#each devices as device}
        <MediaPopupItem
          label={getDeviceLabel(device)}
          disabled={access === 'denied'}
          selected={mediaInfo.activeSpeaker === device}
          selectable
          on:select={() => handleSelectSpk(device)}
        />
      {/each}
    {:else}
      <MediaPopupItem label={media.string.DefaultSpeaker} icon={IconSpkOff} disabled />
    {/if}
  </div>
</MediaPopupItem>
