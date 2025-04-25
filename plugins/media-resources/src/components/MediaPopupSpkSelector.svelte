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
  import { enumerateDevices, updateSelectedSpeakerId } from '@hcengineering/media'
  import { Loading } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import media from '../plugin'
  import { micAccess, sessions } from '../stores'
  import { getDeviceLabel, getSelectedSpeaker } from '../utils'

  import MediaPopupItem from './MediaPopupItem.svelte'
  import IconSpkOn from './icons/Speaker.svelte'
  import IconSpkOff from './icons/Speaker.svelte'

  export let expanded: boolean = false

  let access: 'granted' | 'denied' | 'prompt' = 'prompt'
  let selected: MediaDeviceInfo | null | undefined = undefined
  let devices: Promise<MediaDeviceInfo[]> | null = null

  async function getDevices (): Promise<MediaDeviceInfo[]> {
    if (devices === null) {
      devices = enumerateDevices('audiooutput', access !== 'granted')
    }

    return await devices
  }

  async function handleSelectSpk (device: MediaDeviceInfo | null): Promise<void> {
    if (selected?.deviceId === device?.deviceId) return

    const deviceId = device?.deviceId

    updateSelectedSpeakerId(deviceId)
    selected = device

    $sessions.forEach((p) => {
      p.emit('selected-speaker', deviceId ?? 'default')
    })
  }

  onMount(async () => {
    selected = await getSelectedSpeaker()
  })

  $: access = $micAccess.state
</script>

<MediaPopupItem
  label={selected == null ? media.string.DefaultSpeaker : getDeviceLabel(selected)}
  icon={selected !== null ? IconSpkOn : IconSpkOff}
  disabled={access === 'denied'}
  expandable={true}
  {expanded}
  on:expand
>
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
            disabled={access === 'denied'}
            selected={selected?.deviceId === device.deviceId}
            selectable
            on:select={() => handleSelectSpk(device)}
          />
        {/each}
      {:else}
        <MediaPopupItem label={media.string.DefaultSpeaker} icon={IconSpkOff} disabled />
      {/if}
    {/await}
  </div>
</MediaPopupItem>
