<script lang="ts">
  import { formatName, Person } from '@hcengineering/contact'
  import { getPersonByPersonRefStore } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { Label } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'
  import love from '../../plugin'
  import { liveKitClient, lk } from '../../utils'
  import {
    LocalParticipant,
    LocalTrackPublication,
    Participant,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    RoomEvent,
    Track
  } from 'livekit-client'

  export let hasActiveTrack: boolean = false
  export let showLocalTrack: boolean = true

  let activeTrack: Track | null = null
  let activeParticipant: Participant | null = null
  let screen: HTMLVideoElement

  $: personByRefStore = getPersonByPersonRefStore(
    activeParticipant != null ? [activeParticipant.identity as Ref<Person>] : []
  )
  $: person = activeParticipant != null ? $personByRefStore.get(activeParticipant.identity as Ref<Person>) : undefined
  $: sharerName = (person !== undefined ? person.name : activeParticipant?.name) ?? ''

  function trySetActiveTrack (track: Track | undefined, participant: Participant): boolean {
    if (track === undefined) return false
    if (track.kind !== Track.Kind.Video || track.source !== Track.Source.ScreenShare) return false
    hasActiveTrack = true
    activeTrack = track
    activeParticipant = participant
    track.attach(screen)
    return true
  }

  function clearActiveTrack (track: Track | undefined): void {
    if (track !== activeTrack) return
    hasActiveTrack = false
    activeTrack?.detach()
    activeTrack = null
    activeParticipant = null
  }

  function onTrackSubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    trySetActiveTrack(track, participant)
  }

  function onTrackUnsubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    clearActiveTrack(track)
  }

  function onLocalTrackPublished (publication: LocalTrackPublication, participant: LocalParticipant): void {
    trySetActiveTrack(publication.track, participant)
  }

  function onLocalTrackUnpublished (publication: LocalTrackPublication, participant: LocalParticipant): void {
    clearActiveTrack(publication.track)
  }

  onMount(async () => {
    await liveKitClient.awaitConnect()

    lk.on(RoomEvent.TrackSubscribed, onTrackSubscribed)
    lk.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed)
    for (const participant of lk.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) {
        if (trySetActiveTrack(publication.track, participant)) break
      }
    }

    if (showLocalTrack) {
      lk.on(RoomEvent.LocalTrackPublished, onLocalTrackPublished)
      lk.on(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished)
      for (const publication of lk.localParticipant.trackPublications.values()) {
        if (trySetActiveTrack(publication.track, lk.localParticipant)) break
      }
    }
  })

  onDestroy(() => {
    activeTrack?.detach(screen)
    lk.off(RoomEvent.TrackSubscribed, onTrackSubscribed)
    lk.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed)
    if (showLocalTrack) {
      lk.off(RoomEvent.LocalTrackPublished, onLocalTrackPublished)
      lk.off(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished)
    }
  })
</script>

<video class="screen" bind:this={screen}></video>
{#if activeParticipant != null && sharerName !== ''}
  <div class="label overflow-label">
    <Label label={love.string.ScreenSharedBy} params={{ name: formatName(sharerName) }} />
  </div>
{/if}

<style lang="scss">
  .screen {
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
    height: 100%;
    width: 100%;
    border-radius: 0.75rem;
  }
  .label {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    padding: 0.25rem 0.5rem;
    max-width: calc(100% - 1rem);
    font-weight: 500;
    font-size: 0.75rem;
    line-height: 1rem;
    color: var(--white-color);
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 0.5rem;
    backdrop-filter: blur(3px);
    pointer-events: none;
  }
</style>
