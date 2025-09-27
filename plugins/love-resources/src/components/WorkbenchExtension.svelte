<script lang="ts">
  import { pushRootBarComponent } from '@hcengineering/ui'
  import { RemoteParticipant, RemoteTrack, RemoteTrackPublication, RoomEvent, Track } from 'livekit-client'
  import { onDestroy, onMount } from 'svelte'
  import love from '../plugin'
  import { liveKitClient, lk } from '../utils'
  import { lkSessionConnected } from '../liveKitClient'
  import { subscribeInviteRequests, unsubscribeInviteRequests } from '../invites'
  import { Room } from '@hcengineering/love'
  import { subscribeJoinRequests, unsubscribeJoinRequests } from '../joinRequests'
  import { Ref } from '@hcengineering/core'
  import { myInfo } from '../stores'

  let parentElement: HTMLDivElement

  function handleTrackSubscribed (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    _participant: RemoteParticipant
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
    _participant: RemoteParticipant
  ): void {
    if (track.kind === Track.Kind.Audio) {
      const element = document.getElementById(publication.trackSid)
      if (element != null) {
        parentElement.removeChild(element)
      }
    }
  }

  function subscribeRoomRequests (room: Ref<Room> | undefined): void {
    unsubscribeJoinRequests()
      .then(() => subscribeJoinRequests(room))
      .catch((e) => {
        console.log(e)
      })
  }

  $: subscribeRoomRequests($myInfo?.room)

  onMount(async () => {
    pushRootBarComponent('left', love.component.ControlExt, 20)
    lk.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    lk.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)

    await subscribeInviteRequests()
  })

  onDestroy(async () => {
    await unsubscribeInviteRequests()
    lk.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    lk.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    if ($lkSessionConnected) {
      await liveKitClient.disconnect()
    }
  })
</script>

<div bind:this={parentElement} class="hidden"></div>
