<script lang="ts">
  import { Card } from '@anticrm/board'
  import type { Ref } from '@anticrm/core'
  import tags, { TagElement, TagReference } from '@anticrm/tags'
  import { createQuery, getClient } from '@anticrm/presentation'
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
  import { addCardLabel } from '../../utils/BoardUtils'

  export let object: Card
  export let search: string = ''
  export let onEdit: (label: TagElement) => void
  export let onCreate: () => void

  const client = getClient()

  let hovered: Ref<TagElement> | undefined = undefined
  const dispatch = createEventDispatcher()

  let labels: TagElement[] = []
  const labelsQuery = createQuery()
  $: labelsQuery.query(
    tags.class.TagElement,
    { title: { $like: '%' + search + '%' }, targetClass: board.class.Card },
    (result) => {
      labels = result
    }
  )

  let cardLabels: TagReference[] = []
  let cardLabelRefs: Ref<TagElement>[] = []
  const cardLabelsQuery = createQuery()
  $: cardLabelsQuery.query(tags.class.TagReference, { attachedTo: object._id }, (result) => {
    cardLabels = result
    cardLabelRefs = result.map(({ tag }) => tag)
  })

  async function toggle (label: TagElement) {
    const cardLabel = cardLabels.find(({ tag }) => tag === label._id)
    if (cardLabel) {
      await client.remove(cardLabel)
      return
    }
    addCardLabel(client, object, label)
  }
</script>

<div class="antiPopup w-85 pb-2">
  <div class="relative flex-row-center w-full">
    <div class="flex-center flex-grow fs-title mt-1 mb-1">
      <Label label={board.string.Labels} />
    </div>
    <div class="absolute mr-1 mt-1 mb-1" style:top="0" style:right="0">
      <Button
        icon={IconClose}
        kind="transparent"
        size="small"
        on:click={() => {
          dispatch('close')
        }}
      />
    </div>
  </div>
  <div class="ap-space bottom-divider" />
  <div class="flex-col ml-4 mt-2 mb-1 mr-2 flex-gap-1">
    <div class="p-2 mt-1 mb-1 border-bg-accent border-radius-1">
      <EditBox bind:value={search} maxWidth="100%" placeholder={board.string.SearchLabels} />
    </div>
    <div class="text-md font-medium">
      <Label label={board.string.Labels} />
    </div>
    {#each labels as label}
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
        }}
      >
        <div
          class="relative flex-row-center justify-center border-radius-1 fs-title w-full h-8 mr-2"
          style:background-color={numberToHexColor(label.color)}
          style:box-shadow={hovered === label._id ? `-0.4rem 0 ${numberToRGB(label.color, 0.6)}` : ''}
          on:click={() => toggle(label)}
        >
          {label.title}
          {#if cardLabelRefs.includes(label._id)}
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
