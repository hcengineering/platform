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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import core, { Ref } from '@hcengineering/core'
  import { MeetingMinutes, Room } from '@hcengineering/love'
  import { Loading } from '@hcengineering/ui'

  import love from '../../plugin'
  import VideoTab from './VideoTab.svelte'
  import { isCurrentInstanceConnected, lk } from '../../utils'
  import { rooms } from '../../stores'
  import ChatTab from './ChatTab.svelte'
  import TranscriptionTab from './TranscriptionTab.svelte'

  export let widgetState: WidgetState | undefined
  export let height: string
  export let width: string

  const meetingQuery = createQuery()
  const client = getClient()

  let meetingMinutes: MeetingMinutes | undefined = undefined
  let isMeetingMinutesLoaded = false

  let roomId: Ref<Room> | undefined = undefined
  let room: Room | undefined = undefined
  let sid: string | undefined = undefined

  $: roomId = widgetState?.data?.room
  $: room = roomId !== undefined ? $rooms.find((r) => r._id === roomId) : undefined

  void lk.getSid().then((res) => {
    sid = res
  })

  $: if (!$isCurrentInstanceConnected || widgetState?.data?.room === undefined) {
    closeWidget(love.ids.MeetingWidget)
  }

  $: if (roomId !== meetingMinutes?.room) {
    meetingMinutes = undefined
    isMeetingMinutesLoaded = false
  }

  $: if ($isCurrentInstanceConnected && room && sid) {
    meetingQuery.query(love.class.MeetingMinutes, { room: room._id, sid }, async (res) => {
      meetingMinutes = res[0]
      if (meetingMinutes !== undefined) {
        isMeetingMinutesLoaded = true
      } else {
        void createMeetingMinutes()
      }
    })
  } else {
    meetingQuery.unsubscribe()
    meetingMinutes = undefined
    isMeetingMinutesLoaded = sid !== undefined
  }

  async function createMeetingMinutes (): Promise<void> {
    if (sid === undefined || room === undefined) return
    const dateStr = new Date().toISOString().replace('T', '_').slice(0, 19)
    await client.createDoc(love.class.MeetingMinutes, core.space.Workspace, {
      title: room.name + '_' + dateStr,
      room: room._id,
      sid
    })
  }

  function handleClose (): void {
    minimizeSidebar()
  }
</script>

{#if widgetState && room}
{#if widgetState.tab === 'video'}
  <VideoTab {room}/>
  {:else if widgetState.tab === 'chat'}
  {#if !isMeetingMinutesLoaded}
    <Loading/>
    {:else if meetingMinutes}
  <ChatTab {meetingMinutes} {widgetState} {height} {width} on:close={handleClose}/>
    {/if}
  {:else if widgetState.tab === 'transcription'}
  {#if !isMeetingMinutesLoaded}
    <Loading/>
  {:else if meetingMinutes}
   <TranscriptionTab {meetingMinutes} {widgetState} {height} {width} on:close={handleClose}/>
  {/if}
  {/if}
{/if}
