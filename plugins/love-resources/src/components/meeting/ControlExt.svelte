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
  import { Ref } from '@hcengineering/core'
  import { closePopup, eventToHTMLElement, showPopup, closeTooltip } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { closeWidget } from '@hcengineering/workbench-resources'

  import love from '../../plugin'
  import { infos, myInfo, rooms } from '../../stores'
  import { getMeetingName, getRoomName } from '../../utils'
  import PersonActionPopup from '../PersonActionPopup.svelte'
  import RoomPopup from '../RoomPopup.svelte'
  import RoomButton from '../RoomButton.svelte'
  import { activeMeeting, leaveMeeting } from '../../meetings'
  import { lkSessionConnected } from '../../liveKitClient'
  import { MeetingWithParticipants, ongoingMeetings } from '../../meetingPresence'
  import { Person } from '@hcengineering/contact'

  function openMeeting (meetingInfo: MeetingWithParticipants): (e: MouseEvent) => void {
    return (e: MouseEvent) => {
      closeTooltip()
      showPopup(RoomPopup, { meetingInfo }, eventToHTMLElement(e))
    }
  }

  const myInvitesCategory = 'myInvites'

  $: reception = $rooms.find((f) => f._id === love.ids.Reception)
  $: receptionParticipants = $infos.filter((p) => p.room === love.ids.Reception)

  onDestroy(async () => {
    closePopup(myInvitesCategory)
    closeWidget(love.ids.MeetingWidget)
  })

  function participantClickHandler (e: MouseEvent, person: Ref<Person>): void {
    if ($myInfo !== undefined) {
      showPopup(PersonActionPopup, { room: reception, person }, eventToHTMLElement(e))
    }
  }

  function getParticipantClickHandler (person: Ref<Person>): (e: MouseEvent) => void {
    return (e: MouseEvent) => {
      participantClickHandler(e, person)
    }
  }

  onDestroy(() => {
    removeEventListener('beforeunload', beforeUnloadListener)
  })

  const beforeUnloadListener = () => {
    if ($myInfo !== undefined && $lkSessionConnected) {
      leaveMeeting()
    }
  }

  window.addEventListener('beforeunload', beforeUnloadListener)
</script>

<div class="flex-row-center flex-gap-2">
  {#if $ongoingMeetings.length > 0}
    {#each $ongoingMeetings as ongoingMeeting}
      {#await getMeetingName(ongoingMeeting.meeting) then name}
        <RoomButton
          label={name}
          active={$activeMeeting?.document._id === ongoingMeeting.meeting.document._id}
          on:click={openMeeting(ongoingMeeting)}
          participants={ongoingMeeting.persons.map((person) => ({
            person
          }))}
        />
      {/await}
    {/each}
  {/if}
  {#if reception !== undefined && receptionParticipants.length > 0}
    {#if $ongoingMeetings.length > 0}
      <div class="divider" />
    {/if}
    {#await getRoomName(reception) then name}
      <RoomButton
        label={name}
        participants={receptionParticipants.map((p) => ({
          person: p.person,
          onclick: getParticipantClickHandler(p.person)
        }))}
      />
    {/await}
  {/if}
</div>

<style lang="scss">
  .divider {
    height: 1.5rem;
    border: 1px solid var(--theme-divider-color);
  }
</style>
