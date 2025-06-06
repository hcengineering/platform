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
  import { closeWidget, minimizeSidebar, WidgetState } from '@hcengineering/workbench-resources'
  import { createQuery } from '@hcengineering/presentation'
  import { MeetingMinutes, MeetingStatus, Room } from '@hcengineering/love'
  import { Loading } from '@hcengineering/ui'

  import love from '../../plugin'
  import VideoTab from './VideoTab.svelte'
  import { isCurrentInstanceConnected } from '../../utils'
  import { currentMeetingMinutes, currentRoom } from '../../stores'
  import ChatTab from './ChatTab.svelte'
  import TranscriptionTab from './TranscriptionTab.svelte'

  export let widgetState: WidgetState | undefined
  export let height: string
  export let width: string

  const meetingQuery = createQuery()

  let meetingMinutes: MeetingMinutes | undefined = undefined
  let isMeetingMinutesLoaded = false

  let room: Room | undefined = undefined

  $: room = $currentRoom

  $: if (
    !$isCurrentInstanceConnected ||
    widgetState?.data?.room === undefined ||
    $currentRoom === undefined ||
    $currentRoom._id !== widgetState?.data?.room
  ) {
    closeWidget(love.ids.MeetingWidget)
  }

  $: if (room !== undefined) {
    meetingQuery.query(
      love.class.MeetingMinutes,
      { attachedTo: room._id, status: MeetingStatus.Active },
      async (res) => {
        meetingMinutes = res[0]
        if (meetingMinutes) {
          currentMeetingMinutes.set(meetingMinutes)
        }
        isMeetingMinutesLoaded = true
      }
    )
  } else {
    meetingQuery.unsubscribe()
    meetingMinutes = undefined
    isMeetingMinutesLoaded = false
  }

  function handleClose (): void {
    minimizeSidebar()
  }
</script>

{#if widgetState && room}
  {#if widgetState.tab === 'video'}
    <VideoTab {room} doc={meetingMinutes} on:close={handleClose} />
  {:else if widgetState.tab === 'chat'}
    {#if !isMeetingMinutesLoaded}
      <Loading />
    {:else if meetingMinutes}
      <ChatTab {meetingMinutes} {room} {widgetState} {height} {width} on:close={handleClose} />
    {/if}
  {:else if widgetState.tab === 'transcription'}
    {#if !isMeetingMinutesLoaded}
      <Loading />
    {:else if meetingMinutes}
      <TranscriptionTab {meetingMinutes} {room} {widgetState} {height} {width} on:close={handleClose} />
    {/if}
  {/if}
{/if}
