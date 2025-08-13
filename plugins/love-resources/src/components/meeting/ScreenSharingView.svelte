<script lang="ts">

  import { onMount } from 'svelte'
  import { liveKitClient, lk } from '../../utils'
  import {
    LocalParticipant,
    LocalTrackPublication, RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    RoomEvent,
    Track
  } from 'livekit-client'

  let screen: HTMLVideoElement

  function handleTrackSubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
      track.attach(screen)
    }
  }

  function handleLocalTrack (publication: LocalTrackPublication, participant: LocalParticipant): void {
    if (publication.track?.kind === Track.Kind.Video && publication.track.source === Track.Source.ScreenShare) {
      publication.track.attach(screen)
    }
  }

  onMount(async () => {
    await liveKitClient.awaitConnect()
    for (const participant of lk.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) {
        if (publication.track !== undefined && publication.track.kind === Track.Kind.Video && publication.track.source === Track.Source.ScreenShare) {
          publication.track.attach(screen)
          break
        }
      }
    }
    for (const publication of lk.localParticipant.trackPublications.values()) {
      if (publication.track !== undefined && publication.track.kind === Track.Kind.Video && publication.track.source === Track.Source.ScreenShare) {
        publication.track.attach(screen)
        break
      }
    }
    lk.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    lk.on(RoomEvent.LocalTrackPublished, handleLocalTrack)
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
