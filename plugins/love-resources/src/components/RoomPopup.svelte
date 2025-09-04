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
  import { Person } from '@hcengineering/contact'
  import { UserInfo, getPersonByPersonRef } from '@hcengineering/contact-resources'
  import { Class, Doc, Ref } from '@hcengineering/core'

  import { IconArrowLeft, Location, ModernButton, Scroller, location, navigate, panelstore } from '@hcengineering/ui'

  import { MeetingMinutes, ParticipantInfo, Room, loveId } from '@hcengineering/love'
  import { getClient } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import love from '../plugin'
  import { currentMeetingMinutes, infos, invites, myInfo, myRequests } from '../stores'
  import { tryConnect } from '../utils'
  import { lkSessionConnected } from '../liveKitClient'
  import MicrophoneButton from './meeting/controls/MicrophoneButton.svelte'
  import CameraButton from './meeting/controls/CameraButton.svelte'
  import ShareScreenButton from './meeting/controls/ShareScreenButton.svelte'
  import LeaveRoomButton from './meeting/controls/LeaveRoomButton.svelte'
  import MeetingHeader from './meeting/MeetingHeader.svelte'

  export let room: Room

  const client = getClient()
  async function getPerson (info: ParticipantInfo | undefined): Promise<Person | null> {
    if (info === undefined) {
      return null
    }

    return await getPersonByPersonRef(info.person)
  }

  let joined: boolean = false
  $: joined = $myInfo?.room === room._id

  let info: ParticipantInfo[] = []
  $: info = $infos.filter((p) => p.room === room._id)

  const dispatch = createEventDispatcher()

  async function connect (): Promise<void> {
    await tryConnect($myInfo, room, info, $myRequests, $invites)
    dispatch('close')
  }

  async function back (): Promise<void> {
    const meetingMinutes = $currentMeetingMinutes
    if (meetingMinutes !== undefined) {
      const hierarchy = client.getHierarchy()
      const panelComponent = hierarchy.classHierarchyMixin(
        meetingMinutes._class as Ref<Class<Doc>>,
        view.mixin.ObjectPanel
      )
      const comp = panelComponent?.component ?? view.component.EditDoc
      const loc = await getObjectLinkFragment(hierarchy, meetingMinutes, {}, comp)
      loc.path[2] = loveId
      loc.path.length = 3
      navigate(loc)
    }
  }

  function canGoBack (joined: boolean, location: Location, meetingMinutes?: MeetingMinutes): boolean {
    if (!joined) return false
    if (location.path[2] !== loveId) return true
    if (meetingMinutes === undefined) return false

    const panel = $panelstore.panel
    const { _id } = panel ?? {}

    return _id !== meetingMinutes._id
  }
</script>

<div class="antiPopup room-popup flex-gap-4">
  <MeetingHeader {room} />
  <div class="room-popup__content">
    <Scroller padding={'0.5rem'} stickedScrollBars>
      <div class="room-popup__content-grid">
        {#each info as inf}
          {#await getPerson(inf) then person}
            {#if person}
              <div class="person"><UserInfo value={person} size={'medium'} showStatus={false} /></div>
            {/if}
          {/await}
        {/each}
      </div>
    </Scroller>
  </div>
  <div class="flex-between gap-2">
    {#if joined && $lkSessionConnected}
      <div class="flex-between gap-2">
        <MicrophoneButton size="medium" />
        <CameraButton size="medium" />
        <ShareScreenButton size="medium" on:changeShare={() => dispatch('close')} />
      </div>
    {/if}
    <div style="width: auto" />
    {#if canGoBack(joined, $location, $currentMeetingMinutes)}
      <ModernButton
        icon={IconArrowLeft}
        label={love.string.MeetingMinutes}
        kind={'primary'}
        size={'medium'}
        on:click={back}
      />
    {/if}
    {#if joined}
      <LeaveRoomButton {room} noLabel={false} size="medium" on:leave={() => dispatch('close')} />
    {:else}
      <ModernButton
        icon={love.icon.EnterRoom}
        label={love.string.EnterRoom}
        size={'medium'}
        kind={'primary'}
        autoFocus
        on:click={connect}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .room-popup {
    padding: var(--spacing-2);
    min-width: 35rem;
    max-width: 46rem;
    max-height: 40rem;

    .room-label {
      margin-top: var(--spacing-0_5);
      text-transform: uppercase;
    }
    .title {
      flex-shrink: 0;
      margin-bottom: var(--spacing-2);
      font-size: 1.5rem;
      color: var(--theme-caption-color);
    }

    .room-popup__content {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
      border: 1px solid var(--theme-popup-divider);
      border-radius: var(--medium-BorderRadius);

      &-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        justify-content: stretch;
        align-items: center;
        gap: var(--spacing-1) var(--spacing-2);

        .person {
          display: flex;
          align-items: center;
          min-width: 0;
          min-height: 0;
          color: var(--theme-content-color);
        }
      }
    }

    .room-btns {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--spacing-1) 0 var(--spacing-0_5);
      gap: var(--spacing-1);
      min-width: 0;
      min-height: 0;

      & + .btns {
        padding-top: var(--spacing-1_5);
      }
    }
    .btns {
      padding-top: var(--spacing-2);
    }
  }
</style>
