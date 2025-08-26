<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { Room, RoomType } from '@hcengineering/love'
  import { getClient } from '@hcengineering/presentation'
  import {
    IconMaximize,
    IconUpOutline,
    ModernButton,
    Popup,
    SplitButton,
    eventToHTMLElement,
    showPopup,
    TooltipInstance
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { toggleCamState, toggleMicState, state } from '@hcengineering/media-resources'

  import love from '../plugin'
  import { currentRoom, myInfo, myOffice } from '../stores'
  import {
    isFullScreen,
    isShareWithSound,
    isSharingEnabled,
    isTranscription,
    isTranscriptionAllowed,
    screenSharing,
    startTranscription,
    stopTranscription,
    liveKitClient
  } from '../utils'
  import CamSettingPopup from './meeting/CamSettingPopup.svelte'
  import ControlBarContainer from './ControlBarContainer.svelte'
  import MicSettingPopup from './meeting/MicSettingPopup.svelte'
  import RoomModal from './RoomModal.svelte'
  import ShareSettingPopup from './ShareSettingPopup.svelte'
  import { lkSessionConnected } from '../liveKitClient'
  import MeetingOptionsButton from './meeting/controls/MeetingOptionsButton.svelte'
  import SendReactionButton from './meeting/controls/SendReactionButton.svelte'
  import RoomAccessButton from './meeting/controls/RoomAccessButton.svelte'
  import LeaveRoomButton from './meeting/controls/LeaveRoomButton.svelte'
  import RecordingButton from './meeting/controls/RecordingButton.svelte'
  import TranscriptionButton from './meeting/controls/TranscriptionButton.svelte'

  export let room: Room
  export let canMaximize: boolean = true
  export let fullScreen: boolean = false
  export let onFullScreen: (() => void) | undefined = undefined

  let allowCam: boolean = false
  const allowShare: boolean = true
  let allowLeave: boolean = false
  let noLabel: boolean = false

  $: allowCam = $currentRoom?.type === RoomType.Video
  $: allowLeave = $myInfo?.room !== ($myOffice?._id ?? love.ids.Reception)
  $: isMicEnabled = $state.microphone?.enabled === true
  $: isCamEnabled = $state.camera?.enabled === true

  async function changeShare (): Promise<void> {
    const newValue = !$isSharingEnabled
    const audio = newValue && $isShareWithSound
    await liveKitClient.setScreenShareEnabled(newValue, audio)
  }

  function micSettings (e: MouseEvent): void {
    showPopup(MicSettingPopup, {}, eventToHTMLElement(e))
  }

  function camSettings (e: MouseEvent): void {
    showPopup(CamSettingPopup, {}, eventToHTMLElement(e))
  }

  function shareSettings (e: MouseEvent): void {
    showPopup(ShareSettingPopup, {}, eventToHTMLElement(e))
  }

  const me = getCurrentEmployee()
  const client = getClient()

  const camKeys = client.getModel().findAllSync(view.class.Action, { _id: love.action.ToggleVideo })?.[0]?.keyBinding
  const micKeys = client.getModel().findAllSync(view.class.Action, { _id: love.action.ToggleMic })?.[0]?.keyBinding

  $: withVideo = $screenSharing || room.type === RoomType.Video

  function maximize (): void {
    showPopup(RoomModal, { room }, 'full-centered')
  }
</script>

<div class="control-bar">
  <ControlBarContainer bind:noLabel>
    <svelte:fragment slot="right">
      {#if room._id !== love.ids.Reception && $lkSessionConnected}
        <RoomAccessButton {room} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="center">
      {#if $lkSessionConnected}
        <SendReactionButton />
        <SplitButton
          size={'large'}
          icon={isMicEnabled ? love.icon.MicEnabled : love.icon.MicDisabled}
          showTooltip={{
            label: isMicEnabled ? love.string.Mute : love.string.UnMute,
            keys: micKeys
          }}
          action={toggleMicState}
          secondIcon={IconUpOutline}
          secondAction={micSettings}
          separate
        />
        {#if allowCam}
          <SplitButton
            size={'large'}
            icon={isCamEnabled ? love.icon.CamEnabled : love.icon.CamDisabled}
            showTooltip={{
              label: isCamEnabled ? love.string.StopVideo : love.string.StartVideo,
              keys: camKeys
            }}
            action={toggleCamState}
            secondIcon={IconUpOutline}
            secondAction={camSettings}
            separate
          />
        {/if}
        {#if allowShare}
          <SplitButton
            size={'large'}
            icon={$isSharingEnabled ? love.icon.SharingEnabled : love.icon.SharingDisabled}
            iconProps={{
              fill: $isSharingEnabled ? 'var(--bg-negative-default)' : 'var(--bg-positive-default)'
            }}
            showTooltip={{ label: $isSharingEnabled ? love.string.StopShare : love.string.Share }}
            disabled={($screenSharing && !$isSharingEnabled) || !$lkSessionConnected}
            action={changeShare}
            secondIcon={IconUpOutline}
            secondAction={shareSettings}
            separate
          />
        {/if}
        <RecordingButton {room}/>
        <TranscriptionButton {room}/>
      {:else}
        <RoomAccessButton {room} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="left">
      {#if $lkSessionConnected && withVideo && onFullScreen}
        <ModernButton
          icon={$isFullScreen ? love.icon.ExitFullScreen : love.icon.FullScreen}
          tooltip={{
            label: $isFullScreen ? love.string.ExitingFullscreenMode : love.string.FullscreenMode,
            direction: 'top'
          }}
          kind={'secondary'}
          size={'large'}
          on:click={() => {
            $isFullScreen = !$isFullScreen
          }}
        />
      {/if}

      {#if ($screenSharing || room.type === RoomType.Video) && $lkSessionConnected && canMaximize}
        <ModernButton
          icon={IconMaximize}
          tooltip={{
            label: love.string.FullscreenMode,
            direction: 'top'
          }}
          kind={'secondary'}
          iconSize="medium"
          size={'large'}
          on:click={maximize}
        />
      {/if}
      <MeetingOptionsButton {room} />
      {#if allowLeave}
        <LeaveRoomButton {noLabel} />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="extra">
      {#if fullScreen}
        <Popup fullScreen />
        <TooltipInstance fullScreen />
      {/if}
    </svelte:fragment>
  </ControlBarContainer>
</div>

<style lang="scss">
  .control-bar {
    width: 100%;
    border-top: 1px solid var(--theme-divider-color);
  }
</style>
