<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { Label } from '@hcengineering/ui'
  import training, { type Training } from '@hcengineering/training'
  import { getClient } from '@hcengineering/presentation'
  import TrainingPassingScorePresenter from './TrainingPassingScorePresenter.svelte'

  export let object: Training
  export let readonly: boolean

  let score: HTMLElement
  let isDragging = false

  function onDragStart (event: DragEvent): void {
    if (readonly || event.dataTransfer === null) {
      return
    }
    isDragging = true
    event.dataTransfer.setDragImage(event.target as HTMLElement, 0, 0)
  }

  function onDrag (event: MouseEvent): void {
    if (readonly) {
      return
    }
    if (event.clientX === 0) {
      return
    }
    const rect = score.getBoundingClientRect()
    object.passingScore = Math.round(Math.max(0, Math.min(100, ((event.clientX - rect.x) / rect.width) * 100)))
  }

  function onDragEnd (event: MouseEvent): void {
    if (readonly) {
      return
    }
    onDrag(event)
    isDragging = false
    void getClient().updateDoc(object._class, object.space, object._id, { passingScore: object.passingScore })
  }

  function onClick (event: MouseEvent): void {
    if (readonly) {
      return
    }
    onDragEnd(event)
  }
</script>

<div bind:this={score} class="root" role="presentation" on:click={onClick}>
  <div class="progress" style:width={object.passingScore + '%'}></div>

  <span class="fs-bold text-base"><Label label={training.string.TrainingPassingScore} /></span>
  <span class="flex-grow"></span>
  <span class="fs=-bold">
    <TrainingPassingScorePresenter value={object} />
  </span>

  {#if !readonly}
    <div
      class="handle"
      role="presentation"
      style:left={object.passingScore + '%'}
      draggable="true"
      class:dragging={isDragging}
      on:dragstart={onDragStart}
      on:drag|preventDefault={onDrag}
      on:dragend|preventDefault={onDragEnd}
    />
  {/if}
</div>

<style lang="scss">
  .root {
    align-items: center;
    background-color: var(--negative-button-default);
    border-radius: 1rem;
    color: var(--primary-button-color);
    display: flex;
    flex-wrap: nowrap;
    overflow: hidden;
    padding: 0.5rem 1rem;
    position: relative;
    width: 100%;
    z-index: 1;

    .progress {
      background-color: var(--positive-button-default);
      position: absolute;
      display: block;
      height: 100%;
      left: 0;
      top: 0;
      z-index: -1;
    }

    .handle {
      cursor: col-resize;
      height: 100%;
      left: 0;
      transform: translateX(-50%);
      position: absolute;
      top: 0;
      width: 10px;

      &.dragging {
        opacity: 0;
      }
    }
  }
</style>
