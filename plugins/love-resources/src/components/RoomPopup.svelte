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
  import { Person, getCurrentEmployee } from '@hcengineering/contact'
  import { UserInfo, personByIdStore } from '@hcengineering/contact-resources'
  import { Class, Doc, IdMap, Ref } from '@hcengineering/core'

  import {
    IconArrowLeft,
    IconUpOutline,
    Label,
    Location,
    ModernButton,
    Scroller,
    SplitButton,
    eventToHTMLElement,
    location,
    navigate,
    panelstore,
    showPopup
  } from '@hcengineering/ui'

  import {
    MeetingMinutes,
    ParticipantInfo,
    Room,
    RoomType,
    isOffice,
    loveId,
    roomAccessIcon,
    roomAccessLabel
  } from '@hcengineering/love'
  import { getClient } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import love from '../plugin'
  import { currentMeetingMinutes, currentRoom, infos, invites, myInfo, myOffice, myRequests, rooms } from '../stores'
  import {
    endMeeting,
    getRoomName,
    isCamAllowed,
    isCameraEnabled,
    isConnected,
    isMicAllowed,
    isMicEnabled,
    isShareWithSound,
    isSharingEnabled,
    leaveRoom,
    screenSharing,
    setCam,
    setMic,
    setShare,
    tryConnect
  } from '../utils'
  import CamSettingPopup from './CamSettingPopup.svelte'
  import MicSettingPopup from './MicSettingPopup.svelte'
  import RoomAccessPopup from './RoomAccessPopup.svelte'
  import ShareSettingPopup from './ShareSettingPopup.svelte'

  export let room: Room

  const client = getClient()
  function getPerson (info: ParticipantInfo | undefined, employees: IdMap<Person>): Person | undefined {
    if (info !== undefined) {
      return employees.get(info.person)
    }
  }

  let joined: boolean = false
  $: joined = $myInfo?.room === room._id

  $: isMyOffice = $myInfo?.room === $myOffice?._id

  $: allowLeave = !isMyOffice && $myInfo?.room !== love.ids.Reception

  let info: ParticipantInfo[] = []
  $: info = $infos.filter((p) => p.room === room._id)

  let allowCam: boolean = false
  const allowShare: boolean = true

  $: allowCam = $currentRoom?.type === RoomType.Video

  const dispatch = createEventDispatcher()

  async function changeMute (): Promise<void> {
    await setMic(!$isMicEnabled)
  }

  async function changeCam (): Promise<void> {
    await setCam(!$isCameraEnabled)
  }

  async function changeShare (): Promise<void> {
    const newValue = !$isSharingEnabled
    const audio = newValue && $isShareWithSound
    await setShare(newValue, audio)
  }

  async function leave (): Promise<void> {
    await leaveRoom($myInfo, $myOffice)
    dispatch('close')
  }

  async function end (): Promise<void> {
    if (isOffice(room) && $myInfo !== undefined) {
      await endMeeting(room, $rooms, $infos, $myInfo)
    }
    dispatch('close')
  }

  function shareSettings (e: MouseEvent): void {
    showPopup(ShareSettingPopup, {}, eventToHTMLElement(e))
  }

  async function connect (): Promise<void> {
    await tryConnect($personByIdStore, $myInfo, room, info, $myRequests, $invites)
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

  function micSettings (e: MouseEvent): void {
    showPopup(MicSettingPopup, {}, eventToHTMLElement(e))
  }

  function camSettings (e: MouseEvent): void {
    showPopup(CamSettingPopup, {}, eventToHTMLElement(e))
  }

  function setAccess (e: MouseEvent): void {
    showPopup(RoomAccessPopup, { room }, eventToHTMLElement(e), (res) => {
      if (res !== undefined) {
        room.access = res
      }
    })
  }

  const me = getCurrentEmployee()
  function canGoBack (joined: boolean, location: Location, meetingMinutes?: MeetingMinutes): boolean {
    if (!joined) return false
    if (location.path[2] !== loveId) return true
    if (meetingMinutes === undefined) return false

    const panel = $panelstore.panel
    const { _id } = panel ?? {}

    return _id !== meetingMinutes._id
  }
</script>

<div class="antiPopup room-popup">
  <div class="room-label"><Label label={love.string.Room} /></div>
  <div class="title overflow-label">
    {getRoomName(room, $personByIdStore)}
  </div>
  <div class="room-popup__content">
    <Scroller padding={'0.5rem'} stickedScrollBars>
      <div class="room-popup__content-grid">
        {#each info as inf}
          {@const person = getPerson(inf, $personByIdStore)}
          {#if person}
            <div class="person"><UserInfo value={person} size={'medium'} showStatus={false} /></div>
          {/if}
        {/each}
      </div>
    </Scroller>
  </div>
  {#if joined && $isConnected}
    <div class="room-btns" class:no-video={!allowCam}>
      <SplitButton
        size={'large'}
        icon={$isMicEnabled ? love.icon.MicEnabled : love.icon.MicDisabled}
        label={$isMicEnabled ? love.string.Mute : love.string.UnMute}
        showTooltip={{
          label: !$isMicAllowed ? love.string.MicPermission : $isMicEnabled ? love.string.Mute : love.string.UnMute
        }}
        disabled={!$isMicAllowed}
        action={changeMute}
        secondIcon={IconUpOutline}
        secondAction={micSettings}
        separate
      />
      {#if allowCam}
        <SplitButton
          size={'large'}
          icon={$isCameraEnabled ? love.icon.CamEnabled : love.icon.CamDisabled}
          label={$isCameraEnabled ? love.string.StopVideo : love.string.StartVideo}
          showTooltip={{
            label: !$isCamAllowed
              ? love.string.CamPermission
              : $isCameraEnabled
                ? love.string.StopVideo
                : love.string.StartVideo
          }}
          disabled={!$isCamAllowed}
          action={changeCam}
          secondIcon={IconUpOutline}
          secondAction={camSettings}
          separate
        />
      {/if}
      {#if allowShare}
        <SplitButton
          size={'large'}
          icon={$isSharingEnabled ? love.icon.SharingEnabled : love.icon.SharingDisabled}
          showTooltip={{ label: $isSharingEnabled ? love.string.StopShare : love.string.Share }}
          disabled={($screenSharing && !$isSharingEnabled) || !$isConnected}
          action={changeShare}
          secondIcon={IconUpOutline}
          secondAction={shareSettings}
          separate
        />
      {/if}
      <ModernButton
        icon={roomAccessIcon[room.access]}
        label={roomAccessLabel[room.access]}
        tooltip={{ label: love.string.ChangeAccess }}
        kind={'secondary'}
        size={'large'}
        disabled={isOffice(room) && room.person !== me}
        on:click={setAccess}
      />
    </div>
  {/if}
  {#if $location.path[2] !== loveId || (joined && (allowLeave || isMyOffice)) || !joined}
    <div class="btns flex-row-center flex-reverse flex-no-shrink w-full flex-gap-2">
      {#if joined}
        {#if allowLeave}
          <ModernButton
            label={love.string.LeaveRoom}
            icon={love.icon.LeaveRoom}
            size={'large'}
            kind={'negative'}
            on:click={leave}
          />
        {:else if isMyOffice}
          <ModernButton
            label={love.string.EndMeeting}
            icon={love.icon.LeaveRoom}
            size={'large'}
            kind={'negative'}
            on:click={end}
          />
        {/if}
      {:else}
        <ModernButton
          icon={love.icon.EnterRoom}
          label={love.string.EnterRoom}
          size={'large'}
          kind={'primary'}
          autoFocus
          on:click={connect}
        />
      {/if}
      {#if canGoBack(joined, $location, $currentMeetingMinutes)}
        <ModernButton
          icon={IconArrowLeft}
          label={love.string.MeetingMinutes}
          kind={'primary'}
          size={'large'}
          on:click={back}
        />
      {/if}
    </div>
  {/if}
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
