<script lang="ts">
  import { aiBotSocialIdentityStore } from '@hcengineering/ai-bot-resources'
  import ParticipantView from '../ParticipantView.svelte'
  import { ParticipantData } from '../../types'
  import {
    LocalParticipant,
    LocalTrackPublication, Participant,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication, RoomEvent,
    Track, TrackPublication
  } from 'livekit-client'
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte'
  import { liveKitClient, lk } from '../../utils'
  import { infos } from '../../stores'
  import { Ref } from '@hcengineering/core'
  import { Person } from '@hcengineering/contact'
  import { getPersonRefByPersonIdCb } from '@hcengineering/contact-resources'
  import { Room as TypeRoom } from '@hcengineering/love'

  export let room: Ref<TypeRoom>

  const dispatch = createEventDispatcher()

  let aiPersonRef: Ref<Person> | undefined
  $: if ($aiBotSocialIdentityStore != null) {
    getPersonRefByPersonIdCb($aiBotSocialIdentityStore?._id, (ref) => {
      if (ref != null) {
        aiPersonRef = ref
      }
    })
  } else {
    aiPersonRef = undefined
  }

  let participants: ParticipantData[] = []
  const participantElements: ParticipantView[] = []

  function handleTrackSubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    if (track.kind === Track.Kind.Video) {
      if (track.source !== Track.Source.ScreenShare) {
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
    if (track.kind === Track.Kind.Video && track.source !== Track.Source.ScreenShare) {
      const part = participants.find((p) => p._id === participant.identity)
      if (part !== undefined) {
        participants = participants
      }
    }
  }

  function handleLocalTrack (publication: LocalTrackPublication, participant: LocalParticipant): void {
    if (publication.track?.kind === Track.Kind.Video) {
      if (publication.track.source !== Track.Source.ScreenShare) {
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
    participantElements[index]?.appendChild(element, participant.isCameraEnabled)
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
    await liveKitClient.awaitConnect()
    for (const participant of lk.remoteParticipants.values()) {
      attachParticipant(participant)
      for (const publication of participant.trackPublications.values()) {
        if (publication.track !== undefined && publication.track.kind === Track.Kind.Video) {
          if (publication.track.source !== Track.Source.ScreenShare) {
            const element = publication.track.attach()
            await attachTrack(element, participant)
          }
        }
      }
    }
    attachParticipant(lk.localParticipant)
    for (const publication of lk.localParticipant.trackPublications.values()) {
      if (publication.track !== undefined && publication.track.kind === Track.Kind.Video) {
        if (publication.track.source !== Track.Source.ScreenShare) {
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
          isAgent: info.person === aiPersonRef
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

  function getActiveParticipants (participants: ParticipantData[]): ParticipantData[] {
    const result = participants.filter((p) => !p.isAgent || $infos.some(({ person }) => person === p._id))
    dispatch('participantsCount', result.length)
    return result
  }

  $: activeParticipants = getActiveParticipants(participants)
</script>

{#each activeParticipants as participant, i (participant._id)}
  <div class="video">
    <ParticipantView bind:this={participantElements[i]} {...participant} />
  </div>
{/each}
