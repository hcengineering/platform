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
  import { Room, RoomType } from '@hcengineering/love'
  import { IconMaximize, ModernButton, Popup, showPopup, TooltipInstance } from '@hcengineering/ui'

  import love from '../../plugin'
  import { myInfo, myOffice } from '../../stores'
  import { isFullScreen, screenSharing } from '../../utils'
  import ControlBarContainer from './ControlBarContainer.svelte'
  import RoomModal from '../RoomModal.svelte'
  import { lkSessionConnected } from '../../liveKitClient'
  import MeetingOptionsButton from './controls/MeetingOptionsButton.svelte'
  import SendReactionButton from './controls/SendReactionButton.svelte'
  import RoomAccessButton from './controls/RoomAccessButton.svelte'
  import LeaveRoomButton from './controls/LeaveRoomButton.svelte'
  import RecordingButton from './controls/RecordingButton.svelte'
  import TranscriptionButton from './controls/TranscriptionButton.svelte'
  import MicrophoneButton from './controls/MicrophoneButton.svelte'
  import CameraButton from './controls/CameraButton.svelte'
  import ShareScreenButton from './controls/ShareScreenButton.svelte'

  export let room: Room
  export let canMaximize: boolean = true
  export let fullScreen: boolean = false
  export let onFullScreen: (() => void) | undefined = undefined

  let allowLeave: boolean = false
  let noLabel: boolean = false

  $: allowLeave = $myInfo?.room !== ($myOffice?._id ?? love.ids.Reception)

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
        <MicrophoneButton />
        <CameraButton />
        <ShareScreenButton />
        <RecordingButton {room} />
        <TranscriptionButton {room} />
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

      {#if $lkSessionConnected && canMaximize}
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
        <LeaveRoomButton {room} {noLabel} />
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
