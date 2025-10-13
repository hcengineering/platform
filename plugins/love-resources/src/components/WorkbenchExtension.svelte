<script lang="ts">
  import { pushRootBarComponent } from '@hcengineering/ui'
  import { RemoteParticipant, RemoteTrack, RemoteTrackPublication, RoomEvent, Track } from 'livekit-client'
  import { onDestroy, onMount } from 'svelte'
  import love from '../plugin'
  import { createMeetingWidget, liveKitClient, lk, navigateToMeetingMinutes } from '../utils'
  import { lkSessionConnected } from '../liveKitClient'
  import { subscribeInviteRequests, unsubscribeInviteRequests } from '../invites'
  import { Room } from '@hcengineering/love'
  import { subscribeJoinRequests, unsubscribeJoinRequests } from '../joinRequests'
  import { Ref } from '@hcengineering/core'
  import { myInfo } from '../stores'
  import { closeWidget, sidebarStore } from '@hcengineering/workbench-resources'
  import { currentMeetingMinutes, currentMeetingRoom } from '../meetings'
  import { getClient } from '@hcengineering/presentation'
  import workbench from '@hcengineering/workbench'
  import {
    deleteMyMeetingPresence,
    meetingPresenceTtlSeconds,
    subscribeMeetingPresence,
    unsubscribeMeetingPresence,
    updateMyMeetingPresence
  } from '../meetingPresence'

  let parentElement: HTMLDivElement
  let presenceInterval: number | NodeJS.Timeout | undefined = undefined
  let presenceRoom: Ref<Room> | undefined = undefined
  const client = getClient()

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
    await subscribeMeetingPresence()
  })

  onDestroy(async () => {
    await unsubscribeInviteRequests()
    await unsubscribeMeetingPresence()
    lk.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    lk.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    if ($lkSessionConnected) {
      await liveKitClient.disconnect()
    }
  })

  function checkActiveMeeting (meetingSessionConnected: boolean, room: Room | undefined): void {
    const meetingWidgetState = $sidebarStore.widgetsState.get(love.ids.MeetingWidget)
    const isMeetingWidgetCreated = meetingWidgetState !== undefined

    if (room === undefined) {
      void deletePresence()
      if (isMeetingWidgetCreated) {
        closeWidget(love.ids.MeetingWidget)
      }
      return
    } else if (presenceRoom !== room._id) {
      presenceRoom = room._id
      presenceInterval = setInterval(updatePresence, (meetingPresenceTtlSeconds - 2) * 1000)
      void updatePresence()
    }

    if (meetingSessionConnected) {
      const widget = client.getModel().findAllSync(workbench.class.Widget, { _id: love.ids.MeetingWidget })[0]
      if (widget === undefined) return

      if (!isMeetingWidgetCreated) {
        createMeetingWidget(widget, room._id, meetingSessionConnected)
        void navigateToMeetingMinutes($currentMeetingMinutes)
      }
    } else {
      if (isMeetingWidgetCreated) {
        closeWidget(love.ids.MeetingWidget)
      }
    }
  }

  async function deletePresence (): Promise<void> {
    if (presenceInterval === undefined || presenceRoom === undefined) return
    clearInterval(presenceInterval)
    presenceInterval = undefined
    await deleteMyMeetingPresence(presenceRoom)
    presenceRoom = undefined
  }

  async function updatePresence (): Promise<void> {
    if (presenceRoom === undefined) return
    await updateMyMeetingPresence(presenceRoom)
  }

  $: checkActiveMeeting($lkSessionConnected, $currentMeetingRoom)
</script>

<div bind:this={parentElement} class="hidden"></div>
