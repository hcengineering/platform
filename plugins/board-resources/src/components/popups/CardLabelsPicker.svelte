<script lang="ts">
  import { Card, CardLabel } from '@anticrm/board'
  import type { Ref, WithLookup } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import {
    Button,
    EditBox,
    Icon,
    IconEdit,
    IconCheck,
    IconClose,
    Label,
    numberToHexColor,
    numberToRGB
  } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  import board from '../../plugin'
  import { getBoardLabels } from '../../utils/BoardUtils'

  export let object: WithLookup<Card>
  export let search: string | undefined = undefined
  export let onEdit: (label: CardLabel) => void
  export let onCreate: () => void

  const client = getClient()

  let boardCardLabels: CardLabel[] = []
  let filteredLabels: CardLabel[] = []
  let hovered: Ref<CardLabel> | undefined = undefined
  const dispatch = createEventDispatcher()

  function applySearch () {
    if (!search || search.trim().length <= 0) {
      filteredLabels = boardCardLabels
      return
    }

    const text = search!.toUpperCase()
    filteredLabels = boardCardLabels.filter((l) => l.title?.toUpperCase().includes(text) ?? false)
  }

  async function fetchBoardLabels () {
    if (object.space) {
      boardCardLabels = await getBoardLabels(client, object.space)
      applySearch()
    }
  }

  async function fetch () {
    if (!object) {
      return
    }

    object = await client.findOne(object._class, { _id: object._id }) ?? object
  }

  async function toggle (label: CardLabel) {
    if (!object) {
      return
    }

    const data = { labels: label._id }
    if (object?.labels?.includes(label._id)) {
      await client.update(object, {
        $pull: data
      })
    } else {
      await client.update(object, {
        $push: data
      })
    }

    fetch()
  }

  $: object.space && fetchBoardLabels()

</script>

<div class="antiPopup w-85 pb-2">
  <div class="relative fs-title flex-center h-9">
    <Label label={board.string.Labels} />
    <div class="absolute flex-center mr-2 h-full" style:top="0" style:right="0">
      <Button
        icon={IconClose}
        kind="transparent"
        size="small"
        on:click={() => {
          dispatch('close')
        }} />
    </div>
  </div>
  <div class="ap-space bottom-divider" />
  <div class="flex-col ml-4 mt-2 mb-1 mr-2 flex-gap-1">
    <div class="p-2 mt-1 mb-1 border-bg-accent border-radius-1">
      <EditBox
        bind:value={search}
        maxWidth="100%"
        placeholder={board.string.SearchLabels}
        on:change={() => applySearch()} />
    </div>
    <div class="text-md font-medium">
      <Label label={board.string.Labels} />
    </div>
    {#each filteredLabels as label}
      <div
        class="flex-row-stretch"
        on:mouseover={() => {
          hovered = label._id
        }}
        on:focus={() => {
          hovered = label._id
        }}
        on:mouseout={() => {
          hovered = undefined
        }}
        on:blur={() => {
          hovered = undefined
        }}>
        <div
          class="relative flex-row-center justify-center border-radius-1 fs-title w-full h-8 mr-2"
          style:background-color={numberToHexColor(label.color)}
          style:box-shadow={hovered === label._id ? `-0.4rem 0 ${numberToRGB(label.color, 0.6)}` : ''}
          on:click={() => toggle(label)}>
          {label.title ?? ''}
          {#if object?.labels?.includes(label._id)}
            <div class="absolute flex-center h-full mr-2" style:top="0" style:right="0">
              <Icon icon={IconCheck} size="small" />
            </div>
          {/if}
        </div>
        <Button icon={IconEdit} kind="transparent" on:click={() => onEdit(label)} />
      </div>
    {/each}
    <div class="mt-3" />
    <Button label={board.string.CreateLabel} kind="no-border" on:click={() => onCreate()} />
  </div>
</div>
