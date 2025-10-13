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
  import { minimizeSidebar, WidgetState } from '@hcengineering/workbench-resources'
  import { Loading } from '@hcengineering/ui'

  import VideoTab from './VideoTab.svelte'
  import ChatTab from './ChatTab.svelte'
  import TranscriptionTab from './TranscriptionTab.svelte'
  import LeaveRoomButton from '../controls/LeaveRoomButton.svelte'
  import ControlBarContainer from '../ControlBarContainer.svelte'
  import SendReactionButton from '../controls/SendReactionButton.svelte'
  import MeetingWidgetHeader from './MeetingWidgetHeader.svelte'
  import InviteEmployeeButton from '../invites/InviteEmployeeButton.svelte'
  import MicrophoneButton from '../controls/MicrophoneButton.svelte'
  import CameraButton from '../controls/CameraButton.svelte'
  import ShareScreenButton from '../controls/ShareScreenButton.svelte'
  import { currentMeetingMinutes } from '../../../meetings'

  export let widgetState: WidgetState | undefined
  export let height: string
  export let width: string

  let contentHeight: number = 0

  function handleClose (): void {
    minimizeSidebar()
  }
</script>

{#if widgetState !== undefined && $currentMeetingMinutes !== undefined}
  <div>
    <MeetingWidgetHeader doc={$currentMeetingMinutes} on:close={handleClose} />
  </div>
  <div style="height: 100%; overflow: scroll" bind:clientHeight={contentHeight}>
    {#if widgetState.tab === 'video'}
      <VideoTab on:close={handleClose} />
    {:else if widgetState.tab === 'chat'}
      {#if $currentMeetingMinutes === undefined}
        <Loading />
      {:else}
        <ChatTab
          meetingMinutes={$currentMeetingMinutes}
          {widgetState}
          height={contentHeight + 'px'}
          {width}
          on:close={handleClose}
        />
      {/if}
    {:else if widgetState.tab === 'transcription'}
      {#if $currentMeetingMinutes === undefined}
        <Loading />
      {:else}
        <TranscriptionTab
          meetingMinutes={$currentMeetingMinutes}
          {widgetState}
          height={contentHeight + 'px'}
          {width}
          on:close={handleClose}
        />
      {/if}
    {/if}
  </div>
  <ControlBarContainer size="small">
    <svelte:fragment slot="left">
      <InviteEmployeeButton
        kind="secondary"
        type="type-button-icon"
        size="large"
        iconSize="medium"
        withBackground={false}
      />
    </svelte:fragment>
    <svelte:fragment slot="center">
      <SendReactionButton />
      <MicrophoneButton />
      <CameraButton />
      <ShareScreenButton />
    </svelte:fragment>
    <svelte:fragment slot="right">
      <LeaveRoomButton noLabel={true} />
    </svelte:fragment>
  </ControlBarContainer>
{/if}
