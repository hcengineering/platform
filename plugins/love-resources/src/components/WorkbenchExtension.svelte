<script lang="ts">
  import { pushRootBarComponent, rootBarExtensions } from '@hcengineering/ui'
  import { RemoteParticipant, RemoteTrack, RemoteTrackPublication, RoomEvent, Track } from 'livekit-client'
  import { onDestroy, onMount } from 'svelte'
  import love from '../plugin'
  import { disconnect, isCurrentInstanceConnected, lk } from '../utils'
  import { generateId } from '@hcengineering/core'

  let parentElement: HTMLDivElement

  function handleTrackSubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    if (track.kind === Track.Kind.Audio) {
      const element = track.attach()
      element.id = publication.trackSid
      parentElement.appendChild(element)
    }
  }

  function handleTrackUnsubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ): void {
    if (track.kind === Track.Kind.Audio) {
      const element = document.getElementById(publication.trackSid)
      if (element != null) {
        parentElement.removeChild(element)
      }
    }
  }

  onMount(() => {
    pushRootBarComponent('left', love.component.ControlExt, 20)
    lk.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    lk.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
  })

  onDestroy(async () => {
    lk.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    lk.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    if ($isCurrentInstanceConnected) {
      await disconnect()
    }
  })
</script>

<div bind:this={parentElement}></div>
