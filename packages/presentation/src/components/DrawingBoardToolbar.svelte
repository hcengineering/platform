<!--
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Button, IconDelete, IconEdit } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import IconEraser from './icons/Eraser.svelte'
  import IconMove from './icons/Move.svelte'
  import { DrawingTool } from '../drawing'

  const dispatch = createEventDispatcher()

  export let tool: DrawingTool = 'pen'
  export let penColor = 'blue'
  export let placeInside = false
  export let showPanTool = false
  export let toolbar: HTMLDivElement | undefined

  const penColors = ['red', 'green', 'blue', 'white', 'black']
</script>

<div class="toolbar" class:inside={placeInside} bind:this={toolbar}>
  <Button
    icon={IconDelete}
    kind="icon"
    on:click={() => {
      dispatch('clear')
    }}
  />
  <div class="divider buttons-divider" />
  <Button
    icon={IconEdit}
    kind="icon"
    selected={tool === 'pen'}
    on:click={() => {
      tool = 'pen'
    }}
  />
  <Button
    icon={IconEraser}
    kind="icon"
    selected={tool === 'erase'}
    on:click={() => {
      tool = 'erase'
    }}
  />
  {#if showPanTool}
    <Button
      icon={IconMove}
      kind="icon"
      selected={tool === 'pan'}
      on:click={() => {
        tool = 'pan'
      }}
    />
  {/if}
  <div class="divider buttons-divider" />
  {#each penColors as color}
    <Button
      kind="icon"
      selected={penColor === color}
      on:click={() => {
        penColor = color
        tool = 'pen'
      }}
    >
      <div
        slot="content"
        class="colorIcon"
        class:emphasized={color === 'white' || color === 'black'}
        style:background={color}
      />
    </Button>
  {/each}
</div>

<style lang="scss">
  .toolbar {
    position: absolute;
    display: inline-flex;
    align-items: center;
    padding: 0.25rem;
    bottom: 100%;

    &.inside {
      left: 0.5rem;
      top: 0.5rem;
      bottom: unset;
      background-color: var(--theme-popup-header);
      border-radius: var(--small-BorderRadius);
      border: 1px solid var(--theme-popup-divider);
      box-shadow: 0.05rem 0.05rem 0.25rem rgba(0, 0, 0, 0.2);
      z-index: 1;
    }
  }

  .colorIcon {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    margin: -0.15rem;

    &.emphasized {
      box-shadow: 0px 0px 0.15rem 0px var(--theme-button-contrast-enabled);
    }
  }

  .divider {
    margin: 0 0.25rem;
  }
</style>
