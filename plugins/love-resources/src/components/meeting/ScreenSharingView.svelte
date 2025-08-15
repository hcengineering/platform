<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { liveKitClient, lk } from '../../utils'
  import {
    LocalParticipant,
    LocalTrackPublication,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    RoomEvent,
    Track
  } from 'livekit-client'

  export let hasActiveTrack: boolean = false
  export let showLocalTrack: boolean = true

  let activeTrack: Track | null = null
  let screen: HTMLVideoElement

  function trySetActiveTrack (track: Track | undefined): boolean {
    if (track === undefined) return false
    if (track.kind !== Track.Kind.Video || track.source !== Track.Source.ScreenShare) return false
    hasActiveTrack = true
    activeTrack = track
    track.attach(screen)
    return true
  }

  function clearActiveTrack (track: Track | undefined): void {
    if (track !== activeTrack) return
    hasActiveTrack = false
    activeTrack?.detach()
    activeTrack = null
  }

  function onTrackSubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    trySetActiveTrack(track)
  }

  function onTrackUnsubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    clearActiveTrack(track)
  }

  function onLocalTrackPublished (publication: LocalTrackPublication, participant: LocalParticipant): void {
    trySetActiveTrack(publication.track)
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
        if (trySetActiveTrack(publication.track)) break
      }
    }

    if (showLocalTrack) {
      lk.on(RoomEvent.LocalTrackPublished, onLocalTrackPublished)
      lk.on(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished)
      for (const publication of lk.localParticipant.trackPublications.values()) {
        if (trySetActiveTrack(publication.track)) break
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

<style lang="scss">
  .screen {
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
    height: 100%;
    width: 100%;
    border-radius: 0.75rem;
  }
</style>
