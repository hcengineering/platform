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
  import { ActionIcon, Scroller, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { RoomType, Room as TypeRoom } from '@hcengineering/love'
  import {
    LocalParticipant,
    LocalTrackPublication,
    Participant,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    RoomEvent,
    Track,
    TrackPublication
  } from 'livekit-client'
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte'
  import { Ref } from '@hcengineering/core'
  import { MessageBox } from '@hcengineering/presentation'
  import { Person, PersonAccount } from '@hcengineering/contact'
  import aiBot from '@hcengineering/ai-bot'
  import { personIdByAccountId } from '@hcengineering/contact-resources'

  import love from '../plugin'
  import { currentRoom, infos, myInfo, myOffice } from '../stores'
  import {
    awaitConnect,
    isCameraEnabled,
    isConnected,
    isMicEnabled,
    isSharingEnabled,
    leaveRoom,
    lk,
    screenSharing,
    setCam,
    setMic,
    setShare
  } from '../utils'
  import ParticipantView from './ParticipantView.svelte'

  export let isDock: boolean = false
  export let room: Ref<TypeRoom>
  export let canUnpin: boolean = true

  interface ParticipantData {
    _id: string
    name: string
    muted: boolean
    mirror: boolean
    connecting: boolean
    isAgent: boolean
  }

  let aiPersonId: Ref<Person> | undefined = undefined
  $: aiPersonId = $personIdByAccountId.get(aiBot.account.AIBot as Ref<PersonAccount>)

  const dispatch = createEventDispatcher()

  let participants: ParticipantData[] = []
  const participantElements: ParticipantView[] = []
  let screen: HTMLVideoElement

  function handleTrackSubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    if (track.kind === Track.Kind.Video) {
      if (track.source === Track.Source.ScreenShare) {
        track.attach(screen)
      } else {
        const element = track.attach()
        attachTrack(element, participant)
      }
    } else {
      const part = participants.find((p) => p._id === participant.identity)
      if (part !== undefined) {
        part.muted = publication.isMuted
        participants = participants
      }
    }
  }

  function handleTrackUnsubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    if (track.kind === Track.Kind.Video) {
      if (track.source !== Track.Source.ScreenShare) {
        const part = participants.find((p) => p._id === participant.identity)
        if (part !== undefined) {
          participants = participants
        }
      }
    }
  }

  function handleLocalTrack (publication: LocalTrackPublication, participant: LocalParticipant): void {
    if (publication.track?.kind === Track.Kind.Video) {
      if (publication.track.source === Track.Source.ScreenShare) {
        publication.track.attach(screen)
      } else {
        const element = publication.track.attach()
        void attachTrack(element, participant)
      }
    } else {
      const part = participants.find((p) => p._id === participant.identity)
      if (part !== undefined) {
        part.muted = publication.isMuted
        participants = participants
      }
    }
  }

  async function attachTrack (element: HTMLMediaElement, participant: Participant): Promise<void> {
    let index = participants.findIndex((p) => p._id === participant.identity)
    if (index === -1) {
      index = participants.push({
        _id: participant.identity,
        name: participant.name ?? '',
        muted: !participant.isMicrophoneEnabled,
        mirror: participant.isLocal,
        connecting: false,
        isAgent: participant.isAgent
      })
    }
    participants = participants
    participantElements.length = participants.length
    await tick()
    participantElements[index]?.appendChild(element)
  }

  function attachParticipant (participant: Participant): void {
    const current = participants.find((p) => p._id === participant.identity)
    if (current !== undefined) {
      current.connecting = false
      current.muted = !participant.isMicrophoneEnabled
      current.mirror = participant.isLocal
      participants = participants
      return
    }
    const value: ParticipantData = {
      _id: participant.identity,
      name: participant.name ?? '',
      muted: !participant.isMicrophoneEnabled,
      mirror: participant.isLocal,
      connecting: false,
      isAgent: participant.isAgent
    }
    participants.push(value)
    participants = participants
  }

  function handleParticipantDisconnected (participant: RemoteParticipant): void {
    const index = participants.findIndex((p) => p._id === participant.identity)
    if (index !== -1) {
      participants.splice(index, 1)
      participants = participants
    }
  }

  function muteHandler (publication: TrackPublication, participant: Participant): void {
    if (publication.kind === Track.Kind.Video) {
      if (publication.source === Track.Source.ScreenShare) {
        return
      }
      const index = participants.findIndex((p) => p._id === participant.identity)
      if (index !== -1 && participantElements[index] != null) {
        participantElements[index].setTrackMuted(publication.isMuted)
      }
    } else {
      const part = participants.find((p) => p._id === participant.identity)
      if (part !== undefined) {
        part.muted = publication.isMuted
        participants = participants
      }
    }
  }

  onMount(async () => {
    await awaitConnect()
    for (const participant of lk.remoteParticipants.values()) {
      attachParticipant(participant)
      for (const publication of participant.trackPublications.values()) {
        if (publication.track !== undefined && publication.track.kind === Track.Kind.Video) {
          if (publication.track.source === Track.Source.ScreenShare) {
            publication.track.attach(screen)
          } else {
            const element = publication.track.attach()
            await attachTrack(element, participant)
          }
        }
      }
    }
    attachParticipant(lk.localParticipant)
    for (const publication of lk.localParticipant.trackPublications.values()) {
      if (publication.track !== undefined && publication.track.kind === Track.Kind.Video) {
        if (publication.track.source === Track.Source.ScreenShare) {
          publication.track.attach(screen)
        } else {
          const element = publication.track.attach()
          await attachTrack(element, lk.localParticipant)
        }
      }
    }
    lk.on(RoomEvent.ParticipantConnected, attachParticipant)
    lk.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    lk.on(RoomEvent.TrackMuted, muteHandler)
    lk.on(RoomEvent.TrackUnmuted, muteHandler)
    lk.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    lk.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    lk.on(RoomEvent.LocalTrackPublished, handleLocalTrack)
  })

  onDestroy(
    infos.subscribe((data) => {
      for (const info of data) {
        if (info.room !== room) continue
        const current = participants.find((p) => p._id === info.person)
        if (current !== undefined) continue
        const value: ParticipantData = {
          _id: info.person,
          name: info.name,
          muted: true,
          mirror: false,
          connecting: true,
          isAgent: info.person === aiPersonId
        }
        participants.push(value)
      }
      participants = participants
    })
  )

  onDestroy(() => {
    lk.off(RoomEvent.ParticipantConnected, attachParticipant)
    lk.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    lk.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    lk.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    lk.off(RoomEvent.LocalTrackPublished, handleLocalTrack)
    lk.off(RoomEvent.TrackMuted, muteHandler)
    lk.off(RoomEvent.TrackUnmuted, muteHandler)
  })

  let divScroll: HTMLElement
  let allowCam: boolean = false
  let allowLeave: boolean = false

  $: allowCam = $currentRoom?.type === RoomType.Video
  $: allowLeave = $myInfo?.room !== ($myOffice?._id ?? love.ids.Reception)

  async function changeMute (): Promise<void> {
    if (!$isConnected) return
    await setMic(!$isMicEnabled)
  }

  async function changeCam (): Promise<void> {
    if (!$isConnected || !allowCam) return
    await setCam(!$isCameraEnabled)
  }

  export function canClose (): boolean {
    return false
  }

  async function leave (): Promise<void> {
    showPopup(MessageBox, {
      label: love.string.LeaveRoom,
      message: love.string.LeaveRoomConfirmation,
      action: async () => {
        await leaveRoom($myInfo, $myOffice)
      }
    })
  }

  async function changeShare (): Promise<void> {
    if (!$isConnected) return
    await setShare(!$isSharingEnabled)
  }

  $: dispatchFit($isSharingEnabled)
  $: dispatchFit(participants.length > 0)
  const dispatchFit = (_?: boolean): void => {
    setTimeout(() => {
      if (divScroll) {
        const notFit: number = divScroll.scrollHeight - divScroll.clientHeight
        dispatch('changeContent', { notFit })
      }
    }, 10)
  }

  function getActiveParticipants (participants: ParticipantData[]): ParticipantData[] {
    return participants.filter((p) => !p.isAgent || $infos.some(({ person }) => person === p._id))
  }

  $: activeParticipants = getActiveParticipants(participants)
</script>

<div class="antiPopup videoPopup-container" class:isDock>
  <div class="header">
    <div class="flex-row-center flex-gap-2">
      <ActionIcon
        icon={!$isConnected ? love.icon.Mic : $isMicEnabled ? love.icon.MicEnabled : love.icon.MicDisabled}
        label={$isMicEnabled ? love.string.Mute : love.string.UnMute}
        size={'small'}
        action={changeMute}
        disabled={!$isConnected}
      />
      <ActionIcon
        icon={!$isConnected ? love.icon.Cam : $isCameraEnabled ? love.icon.CamEnabled : love.icon.CamDisabled}
        label={$isCameraEnabled ? love.string.StopVideo : love.string.StartVideo}
        size={'small'}
        action={changeCam}
        disabled={!$isConnected || !allowCam}
      />
      {#if $isConnected}
        <ActionIcon
          icon={$isSharingEnabled ? love.icon.SharingEnabled : love.icon.SharingDisabled}
          label={$isSharingEnabled ? love.string.StopShare : love.string.Share}
          disabled={$screenSharing && !$isSharingEnabled}
          size={'small'}
          action={changeShare}
        />
      {/if}
    </div>
    <div class="flex-row-center flex-gap-2">
      {#if canUnpin}
        <ActionIcon
          icon={view.icon.Pin}
          label={isDock ? view.string.Unpin : view.string.Pin}
          size={'small'}
          action={() => {
            dispatch('dock')
          }}
        />
      {/if}
      {#if allowLeave}
        <ActionIcon
          icon={love.icon.LeaveRoom}
          iconProps={{ color: '#FF6711' }}
          label={love.string.LeaveRoom}
          size={'small'}
          action={leave}
        />
      {/if}
    </div>
  </div>
  <div class="screenContainer" class:hidden={!$screenSharing || $isSharingEnabled}>
    <video class="screen" bind:this={screen}></video>
  </div>
  <Scroller
    bind:divScroll
    noStretch
    padding={'0 .5rem'}
    containerName={'videoPopupСontainer'}
    onResize={dispatchFit}
    stickedScrollBars
  >
    <div class="videoGrid">
      {#each activeParticipants as participant, i (participant._id)}
        <div class="video">
          <ParticipantView bind:this={participantElements[i]} {...participant} small />
        </div>
      {/each}
    </div>
  </Scroller>
  <div class="antiNav-space" />
</div>

<style lang="scss">
  .videoPopup-container {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    max-width: 100%;
    user-select: none;

    &:not(.isDock) {
      border-radius: var(--large-BorderRadius);
    }
    &.isDock {
      background-color: var(--theme-statusbar-color);
      border: none;
      box-shadow: none;
    }
    .header {
      display: flex;
      justify-content: space-between;
      flex-shrink: 0;
      margin: 0.5rem 1rem;
      min-width: 0;
      min-height: 0;
    }
  }

  .screenContainer {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    margin: 0 0.5rem 0.5rem;
    min-height: 0;
    max-height: 100%;
    border-radius: 0.75rem;

    &.hidden {
      display: none;
    }
    .screen {
      object-fit: contain;
      max-width: 100%;
      max-height: 100%;
      border-radius: 0.75rem;
    }
  }

  .videoGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-flow: row;
    gap: var(--spacing-1);
  }
  @container videoPopupСontainer (max-width: 60rem) {
    .videoGrid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @container videoPopupСontainer (max-width: 30rem) {
    .videoGrid {
      grid-template-columns: 1fr;
    }
  }
</style>
