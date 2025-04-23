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
  import {
    cleanupDeviceLabel,
    enumerateDevices,
    updateSelectedCamId,
    updateSelectedMicId,
    updateSelectedSpeakerId
  } from '@hcengineering/media'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import { ComponentExtensions } from '@hcengineering/presentation'
  import { DropdownIntlItem, eventToHTMLElement, showPopup } from '@hcengineering/ui'

  import media from '../plugin'
  import { camAccess, micAccess, state, sessions } from '../stores'
  import { getSelectedCam, getSelectedMic, getSelectedSpeaker } from '../utils'

  import CamSettingsPopup from './CamSettingsPopup.svelte'
  import MediaPopupButton from './MediaPopupButton.svelte'
  import NextSelectPopup from './NextSelectPopup.svelte'
  import IconCam from './icons/Cam.svelte'
  import IconCamOff from './icons/CamOff.svelte'
  import IconMic from './icons/Mic.svelte'
  import IconMicOff from './icons/MicOff.svelte'
  import IconSpeaker from './icons/Speaker.svelte'

  let selectedMic: MediaDeviceInfo | null | undefined = undefined
  let selectedCam: MediaDeviceInfo | null | undefined = undefined
  let selectedSpk: MediaDeviceInfo | null | undefined = undefined

  function getDeviceLabel (device: MediaDeviceInfo): IntlString {
    return getEmbeddedLabel(cleanupDeviceLabel(device.label))
  }

  async function fetchSelectedMic (): Promise<void> {
    selectedMic = await getSelectedMic()
  }

  async function fetchSelectedCam (): Promise<void> {
    selectedCam = await getSelectedCam()
  }

  async function fetchSelectedSpk (): Promise<void> {
    selectedSpk = await getSelectedSpeaker()
  }

  async function showMicSettings (ev: MouseEvent): Promise<void> {
    // TODO We should list all devices while requesting some device so we can have all names
    const devices = await enumerateDevices('audioinput', $micAccess.state !== 'granted')

    const items: DropdownIntlItem[] = devices.map((p) => {
      return {
        id: p.deviceId,
        label: getDeviceLabel(p)
      }
    })

    const onSelect = (res: string): void => {
      const deviceId = res ?? 'default'
      updateSelectedMicId(deviceId)
      void fetchSelectedMic()

      $sessions.forEach((p) => {
        p.emit('selected-microphone', deviceId)
      })
    }

    showPopup(
      NextSelectPopup,
      {
        label: media.string.Microphone,
        items,
        selected: selectedMic?.deviceId,
        onSelect
      },
      eventToHTMLElement(ev)
    )
  }

  async function showSpkSettings (ev: MouseEvent): Promise<void> {
    const devices = await enumerateDevices('audiooutput', $micAccess.state !== 'granted')

    const items: DropdownIntlItem[] = devices.map((p) => {
      return {
        id: p.deviceId,
        label: getDeviceLabel(p)
      }
    })

    const onSelect = (res: string): void => {
      const deviceId = res ?? 'default'
      updateSelectedSpeakerId(deviceId)
      void fetchSelectedSpk()
      $sessions.forEach((p) => {
        p.emit('selected-speaker', deviceId)
      })
    }

    showPopup(
      NextSelectPopup,
      {
        label: media.string.Speaker,
        items,
        selected: selectedSpk?.deviceId,
        onSelect
      },
      eventToHTMLElement(ev)
    )
  }

  async function showCamSettings (ev: MouseEvent): Promise<void> {
    const devices = await enumerateDevices('videoinput', $camAccess.state !== 'granted')

    const selected = selectedCam
    showPopup(
      CamSettingsPopup,
      { devices, selected },
      eventToHTMLElement(ev),
      () => {},
      (res) => {
        const deviceId = res !== null ? (res as string) : media.ids.NoCam
        updateSelectedCamId(deviceId)
        void fetchSelectedCam()
        $sessions.forEach((p) => {
          p.emit('selected-camera', deviceId)
        })
      }
    )
  }

  $: void fetchSelectedCam()
  $: void fetchSelectedMic()
  $: void fetchSelectedSpk()
</script>

<div class="antiPopup thinStyle">
  <div class="ap-space" />

  <ComponentExtensions extension={media.extension.StateContext} />

  <div class="ap-scroll">
    <div class="ap-box">
      <MediaPopupButton
        label={selectedMic == null ? media.string.DefaultMic : getDeviceLabel(selectedMic)}
        icon={selectedMic !== null ? IconMic : IconMicOff}
        disabled={$micAccess.state === 'denied'}
        status={$state.microphone === undefined ? undefined : $state.microphone.enabled ? 'on' : 'off'}
        submenu
        on:click={showMicSettings}
      />

      <div class="ap-menuItem separator halfMargin" />

      <MediaPopupButton
        label={selectedSpk == null ? media.string.DefaultSpeaker : getDeviceLabel(selectedSpk)}
        icon={IconSpeaker}
        disabled={$micAccess.state === 'denied'}
        submenu
        on:click={showSpkSettings}
      />

      <div class="ap-menuItem separator halfMargin" />

      <MediaPopupButton
        label={selectedCam === null
          ? media.string.NoCam
          : selectedCam === undefined
            ? media.string.DefaultCam
            : getDeviceLabel(selectedCam)}
        icon={selectedCam !== null ? IconCam : IconCamOff}
        disabled={$camAccess.state === 'denied'}
        status={$state.camera === undefined ? undefined : $state.camera.enabled ? 'on' : 'off'}
        submenu
        on:click={showCamSettings}
      />
    </div>
  </div>

  <div class="ap-space" />
</div>

<style lang="scss">
  .antiPopup {
    width: 20rem;
  }
</style>
