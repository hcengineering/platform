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
  import { Analytics } from '@hcengineering/analytics'
  import { personByIdStore, personIdByAccountId } from '@hcengineering/contact-resources'
  import { Room as TypeRoom } from '@hcengineering/love'
  import { getMetadata } from '@hcengineering/platform'
  import { Label, Loading, resizeObserver, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
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
  import { onDestroy, onMount, tick } from 'svelte'
  import presentation from '@hcengineering/presentation'
  import aiBot from '@hcengineering/ai-bot'
  import { Ref } from '@hcengineering/core'
  import { Person, PersonAccount } from '@hcengineering/contact'

  import love from '../plugin'
  import { storePromise, currentRoom, infos, invites, myInfo, myRequests } from '../stores'
  import {
    awaitConnect,
    isConnected,
    isCurrentInstanceConnected,
    isFullScreen,
    lk,
    screenSharing,
    tryConnect
  } from '../utils'
  import ControlBar from './ControlBar.svelte'
  import ParticipantView from './ParticipantView.svelte'

  export let withVideo: boolean
  export let canMaximize: boolean = true
  export let room: TypeRoom

  interface ParticipantData {
    _id: string
    name: string
    connecting: boolean
    muted: boolean
    mirror: boolean
    isAgent: boolean
  }

  let participants: ParticipantData[] = []
  const participantElements: ParticipantView[] = []
  let screen: HTMLVideoElement
  let roomEl: HTMLDivElement

  let aiPersonId: Ref<Person> | undefined = undefined
  $: aiPersonId = $personIdByAccountId.get(aiBot.account.AIBot as Ref<PersonAccount>)

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
      updateStyle(getActiveParticipants(participants).length, $screenSharing)
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
        const index = participants.findIndex((p) => p._id === participant.identity)
        if (index !== -1) {
          participants.splice(index, 1)
          participants = participants
        }
      } else {
        track.detach(screen)
      }
      updateStyle(getActiveParticipants(participants).length, $screenSharing)
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
      updateStyle(getActiveParticipants(participants).length, $screenSharing)
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
    for (let attempt = 0; attempt < 10; attempt++) {
      await tick()
      index = participants.findIndex((p) => p._id === participant.identity)
      const el = participantElements[index]
      if (el != null) {
        el.appendChild(element)
        return
      }
    }
    console.error('Failed to attach track after 10 attempts')
    Analytics.handleError(new Error(`Failed to attach track after 10 attempts, participant: ${participant.identity}`))
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
    updateStyle(getActiveParticipants(participants).length, $screenSharing)
  }

  function handleParticipantDisconnected (participant: RemoteParticipant): void {
    const index = participants.findIndex((p) => p._id === participant.identity)
    if (index !== -1) {
      participants.splice(index, 1)
      participants = participants
    }
    updateStyle(getActiveParticipants(participants).length, $screenSharing)
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

  let loading: boolean = false
  let configured: boolean = false

  function handleLocalTrackUnsubscribed (publication: LocalTrackPublication, participant: LocalParticipant): void {
    if (publication?.track?.kind === Track.Kind.Video) {
      if (publication.track.source === Track.Source.ScreenShare) {
        publication.track.detach(screen)
        updateStyle(getActiveParticipants(participants).length, $screenSharing)
      } else {
        const index = participants.findIndex((p) => p._id === participant.identity)
        if (index !== -1) {
          participants.splice(index, 1)
          participants = participants
        }
      }
    }
  }

  onMount(async () => {
    loading = true

    const wsURL = getMetadata(love.metadata.WebSocketURL)

    if (wsURL === undefined) {
      return
    }

    configured = true

    await $storePromise

    if (
      !$isConnected &&
      !$isCurrentInstanceConnected &&
      $myInfo?.sessionId === getMetadata(presentation.metadata.SessionId)
    ) {
      const info = $infos.filter((p) => p.room === room._id)
      await tryConnect($personByIdStore, $myInfo, room, info, $myRequests, $invites)
    }

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
    lk.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnsubscribed)
    roomEl && roomEl.addEventListener('fullscreenchange', handleFullScreen)
    loading = false
  })

  let gridStyle = ''
  let columns: number = 0
  let rows: number = 0
  let roomWidth: number
  let roomHeight: number

  onDestroy(
    infos.subscribe((data) => {
      for (const info of data) {
        if (info.room !== room._id) continue
        const current = participants.find((p) => p._id === info.person)
        if (current !== undefined) continue
        const value: ParticipantData = {
          _id: info.person,
          name: info.name,
          muted: true,
          mirror: false,
          connecting: true,
          isAgent: aiPersonId === info.person
        }
        participants.push(value)
      }
      participants = participants
      updateStyle(getActiveParticipants(participants).length, $screenSharing)
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
    lk.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnsubscribed)
    roomEl.removeEventListener('fullscreenchange', handleFullScreen)
  })

  function updateStyle (count: number, screenSharing: boolean): void {
    columns = screenSharing ? 1 : Math.min(Math.ceil(Math.sqrt(count)), 8)
    rows = Math.ceil(count / columns)
    gridStyle = `grid-template-columns: repeat(${columns}, 1fr); aspect-ratio: ${columns * 1280}/${rows * 720};`
  }

  const handleFullScreen = () => ($isFullScreen = document.fullscreenElement != null)

  function checkFullscreen (): void {
    const needFullScreen = $isFullScreen
    if (document.fullscreenElement && !needFullScreen) {
      document
        .exitFullscreen()
        .then(() => {
          $isFullScreen = false
        })
        .catch((err) => {
          console.log(`Error exiting fullscreen mode: ${err.message} (${err.name})`)
          $isFullScreen = false
        })
    } else if (!document.fullscreenElement && needFullScreen && roomEl != null) {
      roomEl
        .requestFullscreen()
        .then(() => {
          $isFullScreen = true
        })
        .catch((err) => {
          console.log(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`)
          $isFullScreen = false
        })
    }
  }

  function onFullScreen (): void {
    const needFullScreen = !$isFullScreen
    if (!document.fullscreenElement && needFullScreen && roomEl != null) {
      roomEl
        .requestFullscreen()
        .then(() => {
          $isFullScreen = true
        })
        .catch((err) => {
          console.log(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`)
          $isFullScreen = false
        })
    } else if (!needFullScreen) {
      document
        .exitFullscreen()
        .then(() => {
          $isFullScreen = false
        })
        .catch((err) => {
          console.log(`Error exiting fullscreen mode: ${err.message} (${err.name})`)
          $isFullScreen = false
        })
    }
  }

  $: if (((document.fullscreenElement && !$isFullScreen) || $isFullScreen) && roomEl) checkFullscreen()

  function getActiveParticipants (participants: ParticipantData[]): ParticipantData[] {
    return participants.filter((p) => !p.isAgent || $infos.some(({ person }) => person === p._id))
  }

  $: activeParticipants = getActiveParticipants(participants)
</script>

<div bind:this={roomEl} class="flex-col-center w-full h-full" class:theme-dark={$isFullScreen}>
  {#if $isConnected && !$isCurrentInstanceConnected}
    <div class="flex justify-center error h-full w-full clear-mins">
      <Label label={love.string.AnotherWindowError} />
    </div>
  {:else if !configured}
    <div class="flex justify-center error h-full w-full clear-mins">
      <Label label={love.string.ServiceNotConfigured} />
    </div>
  {:else if loading}
    <Loading />
  {/if}
  <div
    class="room-container"
    class:sharing={$screenSharing}
    class:many={columns > 3}
    class:hidden={loading}
    class:mobile={$deviceInfo.isMobile}
  >
    <div class="screenContainer">
      <video class="screen" bind:this={screen}></video>
    </div>
    {#if withVideo}
      <div
        use:resizeObserver={(element) => {
          roomWidth = element.clientWidth
          roomHeight = element.clientHeight
        }}
        class="videoGrid"
        style={$screenSharing ? '' : gridStyle}
        class:scroll-m-0={$screenSharing}
      >
        {#each activeParticipants as participant, i (participant._id)}
          <ParticipantView
            bind:this={participantElements[i]}
            {...participant}
            small={$screenSharing ||
              (!$screenSharing &&
                ((columns > 1 && (roomWidth - 16 * (columns - 1)) / columns < 300) ||
                  (rows > 1 && (roomHeight - 16 * (rows - 1)) / rows < 168)))}
          />
        {/each}
      </div>
    {/if}
  </div>
  {#if $currentRoom}
    <ControlBar room={$currentRoom} fullScreen={$isFullScreen} {onFullScreen} {canMaximize} />
  {/if}
</div>

<style lang="scss">
  .error {
    font-weight: 500;
    font-size: 1.5rem;
    align-items: center;
  }
  .room-container {
    display: flex;
    justify-content: center;
    padding: 1rem;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;

    .screenContainer {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      max-height: 100%;
      min-height: 0;
      width: 100%;
      border-radius: 0.75rem;

      .screen {
        object-fit: contain;
        max-width: 100%;
        max-height: 100%;
        height: 100%;
        width: 100%;
        border-radius: 0.75rem;
      }
    }
    &:not(.sharing) {
      gap: 0;

      .videoGrid {
        display: grid;
        grid-auto-rows: 1fr;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        max-height: 100%;
        max-width: 100%;
      }
      .screenContainer {
        display: none;
      }
    }
    &.sharing {
      gap: 1rem;

      .videoGrid {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 0.5rem 0;
        padding: 0 0.5rem;
        width: 15rem;
        min-width: 15rem;
        min-height: 0;
        max-width: 15rem;
      }
    }

    &.many {
      padding: 0.5rem;

      &:not(.sharing) .videoGrid,
      &.sharing {
        gap: 0.5rem;
      }
    }

    &.mobile {
      padding: var(--spacing-0_5);

      &:not(.sharing) .videoGrid,
      &.sharing {
        gap: var(--spacing-0_5);
      }
    }
  }
  .hidden {
    display: none;
  }
</style>
