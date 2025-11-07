<script lang="ts">
  import ParticipantView from './ParticipantView.svelte'
  import { Participant, RemoteParticipant, RoomEvent } from 'livekit-client'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { liveKitClient, lk } from '../../utils'
  import { infos } from '../../stores'

  const dispatch = createEventDispatcher()

  interface ParticipantData {
    _id: string
    participant: Participant | undefined
    isAgent: boolean
  }

  let participants: ParticipantData[] = []

  function attachParticipant (participant: Participant): void {
    const current = participants.find((p) => p._id === participant.identity)
    if (current !== undefined) {
      current.participant = participant
      participants = participants
      return
    }
    const value: ParticipantData = {
      _id: participant.identity,
      participant,
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

  onMount(async () => {
    await liveKitClient.awaitConnect()
    for (const participant of lk.remoteParticipants.values()) {
      attachParticipant(participant)
    }
    attachParticipant(lk.localParticipant)
    lk.on(RoomEvent.ParticipantConnected, attachParticipant)
    lk.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
  })

  onDestroy(() => {
    lk.off(RoomEvent.ParticipantConnected, attachParticipant)
    lk.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
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
    <ParticipantView {...participant} />
  </div>
{/each}
