<!--
  Copyright © 2024 Hardcore Engineering Inc.
-->

<script lang="ts" context="module">
  export interface OptionsListDropEventData {
    from: number
    to: number
  }
  export type OptionsListDropEvent = CustomEvent<OptionsListDropEventData>
</script>

<script lang="ts">
  import questions from '@hcengineering/questions'
  import { Icon } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import LayoutRow from './LayoutRow.svelte'

  type T = any

  export let items: T[]
  export let append = false
  export let canDrag = false
  export let showDrag = false
  export let showCorrect = false
  export let showBullet = false

  let draggedIndex: number | undefined = undefined
  let draggedOverIndex: number | undefined = undefined
  const elements: HTMLElement[] = []
  const dispatch = createEventDispatcher<{
    drop: { from: number, to: number }
  }>()

  function onDragStart (event: DragEvent, index: number): void {
    if (!canDrag || event.dataTransfer === null) {
      return
    }
    event.dataTransfer.setDragImage(
      elements[index],
      (event.target as HTMLElement).offsetWidth / 2,
      (event.target as HTMLElement).offsetHeight / 2
    )
    draggedIndex = index
  }

  function onDragOver (event: DragEvent, index: number): void {
    if (!canDrag || event.dataTransfer === null) {
      return
    }
    if (draggedIndex === undefined || index === draggedIndex + 1) {
      return
    }
    draggedOverIndex = index
  }

  function onDragLeave (event: DragEvent, index: number): void {
    if (!canDrag || event.dataTransfer === null) {
      return
    }
    if (draggedIndex === undefined) {
      return
    }
    if (draggedOverIndex !== index) {
      return
    }
    draggedOverIndex = undefined
  }

  function onDragEnd (event: DragEvent): void {
    if (!canDrag || event.dataTransfer === null) {
      return
    }
    if (draggedIndex !== undefined && draggedOverIndex !== undefined) {
      dispatch('drop', { from: draggedIndex, to: draggedOverIndex })
    }
    draggedIndex = undefined
    draggedOverIndex = undefined
  }
</script>

<div role="list">
  {#each items as item, index (index)}
    <div
      bind:this={elements[index]}
      role="listitem"
      on:dragover|preventDefault={(event) => {
        onDragOver(event, index)
      }}
      on:dragleave|preventDefault={(event) => {
        onDragLeave(event, index)
      }}
      on:dragend={onDragEnd}
      class:dragged-over={index === draggedOverIndex}
      class:is-dragged={index === draggedIndex}
    >
      <LayoutRow {showDrag} {showCorrect} {showBullet}>
        <svelte:fragment slot="drag">
          {#if canDrag}
            <div
              class="handle"
              role="presentation"
              draggable={true}
              on:dragstart={(event) => {
                onDragStart(event, index)
              }}
            >
              <Icon icon={questions.icon.MiniDrag} size="small" />
            </div>
          {/if}
        </svelte:fragment>

        <slot name="bullet" slot="bullet" {item} {index} />
        <slot name="correct" slot="correct" {item} {index} />
        <slot name="label" slot="label" {item} {index} />
      </LayoutRow>
    </div>
  {/each}

  {#if append}
    <LayoutRow showDrag={true} showBullet={!!$$slots.bullet} showCorrect={!!$$slots.correct}>
      <svelte:fragment slot="drag">&nbsp;</svelte:fragment>
      <slot name="append-bullet" slot="bullet" />
      <slot name="append-correct" slot="correct" />
      <slot name="append-label" slot="label" />
    </LayoutRow>
  {/if}
</div>

<style lang="scss">
  .handle {
    cursor: grab;
  }
  .is-dragged {
    opacity: 0.2;
  }
  .dragged-over:not(.is-dragged) {
    transition: box-shadow 0.016s ease-in;
    box-shadow: 0 -1px 0 0 var(--primary-button-outline);
  }
</style>
