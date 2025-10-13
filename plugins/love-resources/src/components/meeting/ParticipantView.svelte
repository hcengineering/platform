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
  import { formatName, Person } from '@hcengineering/contact'
  import { Avatar, getPersonByPersonRefStore } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { Loading } from '@hcengineering/ui'
  import MicDisabled from '../icons/MicDisabled.svelte'
  import { onDestroy, onMount } from 'svelte'
  import {
    ChatMessage,
    ConnectionQuality,
    LocalParticipant,
    type LocalTrackPublication,
    Participant,
    ParticipantEvent,
    RemoteParticipant,
    type RemoteTrack,
    type RemoteTrackPublication,
    RoomEvent,
    Track,
    TrackPublication
  } from 'livekit-client'
  import BadConnection from '../icons/BadConnection.svelte'
  import { lk } from '../../utils'
  import Reaction from './Reaction.svelte'

  export let _id: string
  export let participant: Participant | undefined = undefined

  let parent: HTMLDivElement
  let mirror: boolean

  let activeParticipant: Participant | undefined = undefined
  let videoTrack: Track | undefined = undefined
  let videoTrackElement: HTMLMediaElement | undefined = undefined
  let videoMuted: boolean = true
  let microphoneMuted: boolean = true
  let isSpeaking: boolean = false
  let isBadConnection: boolean = false

  $: personByRefStore = getPersonByPersonRefStore([_id as Ref<Person>])
  $: user = $personByRefStore.get(_id as Ref<Person>)
  $: userName = (user !== undefined ? user.name : activeParticipant?.name) ?? ''

  function attachTrack (track: Track): void {
    if (parent == null) return
    detachCurrentTrack()

    videoTrack = track
    videoTrackElement = track.attach()
    const enabled = activeParticipant?.isCameraEnabled ?? false

    videoTrackElement.classList.add('video')
    if (!enabled) videoTrackElement.classList.add('hidden')
    parent.appendChild(videoTrackElement)
    videoMuted = !enabled
  }

  function detachCurrentTrack (): void {
    if (videoTrackElement !== undefined) {
      videoTrack?.detach(videoTrackElement)
      videoTrackElement.remove()
    }
  }

  function setTrackMuted (value: boolean): void {
    if (videoTrackElement !== undefined) {
      if (value) {
        videoTrackElement.classList.add('hidden')
      } else {
        videoTrackElement.classList.remove('hidden')
      }
    }
    videoMuted = value
  }

  function speachHandler (speaking: boolean): void {
    isSpeaking = speaking
  }

  function muteHandler (publication: TrackPublication): void {
    if (publication.kind === Track.Kind.Audio) {
      microphoneMuted = publication.isMuted
    } else if (publication.kind === Track.Kind.Video && publication.source !== Track.Source.ScreenShare) {
      setTrackMuted(publication.isMuted)
    }
  }

  function onConnectionQualityChanged (quality: ConnectionQuality): void {
    isBadConnection = quality === ConnectionQuality.Lost || quality === ConnectionQuality.Poor
  }

  function onLocalTrackPublished (publication: LocalTrackPublication): void {
    if (publication.track === undefined) return
    if (publication.kind === Track.Kind.Audio) {
      microphoneMuted = publication.isMuted
    } else if (publication.kind === Track.Kind.Video && publication.source !== Track.Source.ScreenShare) {
      attachTrack(publication.track)
    }
  }

  function onLocalTrackUnpublished (publication: LocalTrackPublication): void {
    if (videoTrack === publication.track) {
      detachCurrentTrack()
    }
  }

  function onTrackSubscribed (track: RemoteTrack, publication: RemoteTrackPublication): void {
    if (track.kind === Track.Kind.Audio) {
      microphoneMuted = track.isMuted
    } else if (track.kind === Track.Kind.Video && track.source !== Track.Source.ScreenShare) {
      attachTrack(track)
    }
  }

  function onTrackUnsubscribed (track: RemoteTrack, publication: RemoteTrackPublication): void {
    if (videoTrack === track) {
      detachCurrentTrack()
    }
  }

  function detachParticipant (): void {
    if (activeParticipant === undefined) return
    activeParticipant.off(ParticipantEvent.TrackMuted, muteHandler)
    activeParticipant.off(ParticipantEvent.TrackUnmuted, muteHandler)
    activeParticipant.off(ParticipantEvent.IsSpeakingChanged, speachHandler)
    if (activeParticipant.isLocal) {
      activeParticipant.off(ParticipantEvent.LocalTrackPublished, onLocalTrackPublished)
      activeParticipant.off(ParticipantEvent.LocalTrackUnpublished, onLocalTrackUnpublished)
    } else {
      activeParticipant.off(ParticipantEvent.TrackSubscribed, onTrackSubscribed)
      activeParticipant.off(ParticipantEvent.TrackUnsubscribed, onTrackUnsubscribed)
    }
    activeParticipant = undefined
  }

  function onChatMessage (message: ChatMessage, participant?: RemoteParticipant | LocalParticipant | undefined): void {
    if (activeParticipant !== participant) return
    reactions = [
      ...reactions,
      {
        id: message.id,
        emoji: message.message,
        width: parent.offsetWidth,
        height: parent.offsetHeight
      }
    ]
  }

  let reactions: Array<{ id: string, emoji: string, height: number, width: number }> = []

  function setParticipant (p: Participant | undefined): void {
    if (parent == null) return
    if (activeParticipant === p) return

    detachParticipant()
    detachCurrentTrack()

    activeParticipant = p
    if (p === undefined) return

    for (const publication of p.trackPublications.values()) {
      if (
        publication.track !== undefined &&
        publication.track.kind === Track.Kind.Video &&
        publication.track.source !== Track.Source.ScreenShare
      ) {
        attachTrack(publication.track)
        break
      }
    }

    mirror = p.isLocal
    microphoneMuted = !p.isMicrophoneEnabled

    p.on(ParticipantEvent.TrackMuted, muteHandler)
    p.on(ParticipantEvent.TrackUnmuted, muteHandler)
    p.on(ParticipantEvent.IsSpeakingChanged, speachHandler)
    p.on(ParticipantEvent.ConnectionQualityChanged, onConnectionQualityChanged)

    if (p.isLocal) {
      p.on(ParticipantEvent.LocalTrackPublished, onLocalTrackPublished)
      p.on(ParticipantEvent.LocalTrackUnpublished, onLocalTrackUnpublished)
    } else {
      p.on(ParticipantEvent.TrackSubscribed, onTrackSubscribed)
      p.on(ParticipantEvent.TrackUnsubscribed, onTrackUnsubscribed)
    }
  }

  $: setParticipant(participant)

  onDestroy(() => {
    lk.off(RoomEvent.ChatMessage, onChatMessage)
    detachCurrentTrack()
  })

  onMount(() => {
    lk.on(RoomEvent.ChatMessage, onChatMessage)
    setParticipant(participant)
  })
</script>

<div id={_id} class="parent" class:speach={isSpeaking}>
  <div bind:this={parent} class="cover" class:active={!videoMuted} class:mirror={mirror && !videoMuted} />
  <div class="ava">
    <Avatar size={'full'} name={userName} person={user} showStatus={false} />
  </div>
  <div class="label" class:withIcon={microphoneMuted || isBadConnection || participant === undefined}>
    {#if participant === undefined}<Loading size={'small'} shrink />{/if}
    {#if isBadConnection}<BadConnection fill={'var(--bg-negative-default)'} size={'small'} />{/if}
    {#if microphoneMuted}<MicDisabled fill={'var(--bg-negative-default)'} size={'small'} />{/if}
    <span class="overflow-label">{formatName(userName)}</span>
  </div>
  {#each reactions as reaction (reaction.id)}
    <Reaction
      {...reaction}
      on:complete={() => {
        reactions = reactions.filter((it) => it !== reaction)
      }}
    />
  {/each}
</div>

<style lang="scss">
  :global(.video) {
    object-fit: cover;
    border-radius: 0.75rem;
    width: 100%;
  }
  :global(.hidden) {
    display: none;
  }
  .cover {
    overflow: hidden;
    object-fit: cover;
    border-radius: 0.75rem;
    height: 100%;
    width: 100%;
    aspect-ratio: 1280 / 720;
    display: flex;
    justify-content: center;
    align-items: center;

    &.mirror {
      transform: scaleX(-1);
    }

    &.active + .ava {
      display: none;
    }
    &:not(.active) {
      background-color: black;
    }
  }
  .ava {
    overflow: hidden;
    position: absolute;
    top: 50%;
    left: 50%;
    height: 50%;
    aspect-ratio: 1;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }
  .parent {
    position: relative;
    flex-shrink: 0;
    height: max-content;
    min-height: 0;
    max-height: 100%;
    background-color: black;
    border-radius: 0.75rem;

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      top: 0.25rem;
      left: 0.25rem;
      max-width: 12rem;
      font-weight: 500;
      font-size: 0.75rem;
      line-height: 1rem;
      color: var(--white-color);
      background-color: rgba(0, 0, 0, 0.5);
      border-radius: 0.5rem;
      backdrop-filter: blur(3px);

      &.withIcon {
        padding-left: 0.25rem;
      }
    }
    &.speach::before,
    &.speach::after {
      position: absolute;
      content: '';
      inset: 0;
      border-radius: 0.75rem;
      z-index: 1;
    }
    &.speach::before {
      border: 3px solid var(--border-talk-indication-secondary);
    }
    &.speach::after {
      border: 2px solid var(--border-talk-indication-primary);
    }
  }
</style>
