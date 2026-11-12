<script lang="ts">
  import { aiBotSocialIdentityStore } from '@hcengineering/ai-bot-resources'
  import ParticipantView from './ParticipantView.svelte'
  import { Participant, RemoteParticipant, RoomEvent } from 'livekit-client'
  import { createEventDispatcher, onDestroy, onMount, tick, afterUpdate } from 'svelte'
  import { liveKitClient, lk } from '../../utils'
  import { infos } from '../../stores'
  import { Ref } from '@hcengineering/core'
  import { Person } from '@hcengineering/contact'
  import { getPersonRefByPersonIdCb } from '@hcengineering/contact-resources'
  import { Room as TypeRoom } from '@hcengineering/love'

  export let room: Ref<TypeRoom>

  const dispatch = createEventDispatcher()

  interface ParticipantData {
    _id: string
    participant: Participant | undefined
    isAgent: boolean
  }

  const MIN_TILE_WIDTH = 192
  const DEFAULT_GRID_GAP = 16
  const TILE_ASPECT_RATIO = 16 / 9

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
  let activeParticipants: ParticipantData[] = []

  let container: HTMLDivElement | undefined
  let columns = 1
  let gridStyle = `--participant-min-width: ${MIN_TILE_WIDTH}px; --participant-columns: ${columns}; --participant-tile-width: ${MIN_TILE_WIDTH}px; --participant-grid-width: ${MIN_TILE_WIDTH}px;`

  let resizeObserver: ResizeObserver | undefined

  function attachParticipant (participant: Participant): void {
    const current = participants.find((p) => p._id === participant.identity)
    if (current !== undefined) {
      current.participant = participant
      participants = [...participants]
      return
    }
    const value: ParticipantData = {
      _id: participant.identity,
      participant,
      isAgent: participant.isAgent
    }
    participants = [...participants, value]
  }

  function handleParticipantDisconnected (participant: RemoteParticipant): void {
    const index = participants.findIndex((p) => p._id === participant.identity)
    if (index !== -1) {
      participants.splice(index, 1)
      participants = [...participants]
    }
  }

  function getGapPx (): number {
    if (container == null) return DEFAULT_GRID_GAP
    const styles = getComputedStyle(container)
    const gap = parseFloat(styles.columnGap)
    return Number.isFinite(gap) ? gap : DEFAULT_GRID_GAP
  }

  const round = (value: number): number => (Number.isFinite(value) ? Number(value.toFixed(2)) : 0)

  function updateLayout (): void {
    if (container == null) return

    const count = activeParticipants.length
    const width = container.clientWidth
    const height = container.clientHeight
    const gap = getGapPx()

    if (count === 0 || width <= 0) {
      columns = 1
      gridStyle = `--participant-min-width: ${MIN_TILE_WIDTH}px; --participant-columns: ${columns}; --participant-tile-width: ${MIN_TILE_WIDTH}px; --participant-grid-width: ${MIN_TILE_WIDTH}px;`
      return
    }

    const maxColumns = Math.max(1, Math.min(count, Math.floor((width + gap) / (MIN_TILE_WIDTH + gap)) || 1))

    let bestCols = 0
    let bestTileWidth = MIN_TILE_WIDTH
    let bestArea = -1

    for (let cols = 1; cols <= maxColumns; cols++) {
      const rows = Math.ceil(count / cols)
      const totalGapWidth = gap * Math.max(cols - 1, 0)
      const usableWidth = width - totalGapWidth
      if (usableWidth <= 0) continue

      const widthLimited = usableWidth / cols
      const minAllowedWidth = Math.min(MIN_TILE_WIDTH, width)
      if (widthLimited < minAllowedWidth) continue

      let tileWidth = widthLimited
      if (height > 0) {
        const totalGapHeight = gap * Math.max(rows - 1, 0)
        const usableHeight = height - totalGapHeight
        if (usableHeight > 0) {
          const heightLimited = (usableHeight / rows) * TILE_ASPECT_RATIO
          tileWidth = Math.min(tileWidth, heightLimited)
        }
      }

      if (tileWidth < Math.min(MIN_TILE_WIDTH, width)) continue

      const tileHeight = tileWidth / TILE_ASPECT_RATIO
      const totalHeight = tileHeight * rows + gap * Math.max(rows - 1, 0)
      if (height > 0 && totalHeight > height + 0.5) continue

      const area = tileWidth * tileHeight

      if (area > bestArea + 0.1 || (Math.abs(area - bestArea) < 0.1 && cols < bestCols)) {
        bestArea = area
        bestCols = cols
        bestTileWidth = tileWidth
      }
    }

    if (bestArea >= 0 && bestCols > 0) {
      const roundedTile = round(Math.min(bestTileWidth, width))
      const gridWidth = round(Math.min(width, roundedTile * bestCols + gap * Math.max(bestCols - 1, 0)))
      columns = bestCols
      gridStyle = `--participant-min-width: ${MIN_TILE_WIDTH}px; --participant-columns: ${bestCols}; --participant-tile-width: ${roundedTile}px; --participant-grid-width: ${gridWidth}px;`
      return
    }

    let fallbackCols = Math.max(1, Math.min(count, maxColumns))
    let fallbackTileWidth = 0
    while (fallbackCols > 1) {
      const usableWidth = width - gap * Math.max(fallbackCols - 1, 0)
      const candidateWidth = usableWidth / fallbackCols
      if (candidateWidth >= Math.min(MIN_TILE_WIDTH, width)) {
        fallbackTileWidth = candidateWidth
        break
      }
      fallbackCols--
    }
    if (fallbackTileWidth === 0) {
      fallbackCols = 1
      fallbackTileWidth = Math.min(width, Math.max(MIN_TILE_WIDTH, width))
    }

    const roundedTile = round(Math.min(fallbackTileWidth, width))
    const gridWidth = round(Math.min(width, roundedTile * fallbackCols + gap * Math.max(fallbackCols - 1, 0)))
    columns = fallbackCols
    gridStyle = `--participant-min-width: ${MIN_TILE_WIDTH}px; --participant-columns: ${fallbackCols}; --participant-tile-width: ${roundedTile}px; --participant-grid-width: ${gridWidth}px;`
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

  onMount(async () => {
    if (typeof ResizeObserver === 'undefined') return
    await tick()
    if (container == null) return

    resizeObserver = new ResizeObserver(() => {
      updateLayout()
    })
    resizeObserver.observe(container)
    updateLayout()
  })

  onDestroy(
    infos.subscribe((data) => {
      for (const info of data) {
        if (info.room !== room) continue
        const current = participants.find((p) => p._id === info.person)
        if (current !== undefined) continue
        const value: ParticipantData = {
          _id: info.person,
          participant: undefined,
          isAgent: info.person === aiPersonRef
        }
        participants.push(value)
      }
      participants = [...participants]
    })
  )

  onDestroy(() => {
    lk.off(RoomEvent.ParticipantConnected, attachParticipant)
    lk.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    resizeObserver?.disconnect()
  })

  function getActiveParticipants (participants: ParticipantData[]): ParticipantData[] {
    const result = participants.filter((p) => !p.isAgent || $infos.some(({ person }) => person === p._id))
    dispatch('participantsCount', result.length)
    return result
  }

  $: activeParticipants = getActiveParticipants(participants)

  afterUpdate(() => {
    updateLayout()
  })
</script>

<div bind:this={container} class="participants-grid" style={gridStyle}>
  {#each activeParticipants as participant (participant._id)}
    <div class="tile">
      <ParticipantView {...participant} />
    </div>
  {/each}
</div>

<style lang="scss">
  .participants-grid {
    display: grid;
    width: 100%;
    max-width: var(--participant-grid-width, 100%);
    height: 100%;
    min-width: 0;
    min-height: 0;
    gap: var(--participants-gap, 1rem);
    justify-content: center;
    align-content: start;
    grid-auto-flow: row dense;
    grid-template-columns: repeat(
      var(--participant-columns, 1),
      minmax(var(--participant-min-width, 192px), var(--participant-tile-width, 1fr))
    );
    overflow: auto;
  }

  .tile {
    display: flex;
    width: 100%;
    aspect-ratio: 16 / 9;
  }

  .tile :global(.parent) {
    width: 100%;
    height: 100%;
  }
</style>
