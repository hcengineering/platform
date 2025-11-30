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
  import { Ref } from '@hcengineering/core'
  import { Room as TypeRoom } from '@hcengineering/love'
  import { createEventDispatcher, afterUpdate } from 'svelte'

  import ParticipantsListView from './meeting/ParticipantsListView.svelte'
  import ScreenSharingView from './meeting/ScreenSharingView.svelte'

  export let isDock: boolean = false
  export let room: Ref<TypeRoom>

  const dispatch = createEventDispatcher()

  let withScreenSharing: boolean = false
  let participantsPane: HTMLElement | undefined

  const dispatchFit = (): void => {
    setTimeout(() => {
      if (participantsPane == null) return
      const notFit = participantsPane.scrollHeight - participantsPane.clientHeight
      dispatch('changeContent', { notFit })
    }, 10)
  }

  afterUpdate(dispatchFit)
</script>

<div class="antiPopup videoPopup-container" class:isDock>
  <div class="screenContainer" class:hidden={!withScreenSharing}>
    <ScreenSharingView showLocalTrack={false} bind:hasActiveTrack={withScreenSharing} />
  </div>
  <div class="participantsPane" bind:this={participantsPane}>
    <ParticipantsListView
      {room}
      on:participantsCount={() => {
        dispatchFit()
      }}
    />
  </div>
  <div class="antiNav-space" />
</div>

<style lang="scss">
  .videoPopup-container {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    max-width: 100%;
    user-select: none;

    &:not(.isDock) {
      border-radius: var(--large-BorderRadius);
    }
    &.isDock {
      background-color: var(--theme-statusbar-color);
      border: none;
      box-shadow: none;
    }
  }

  .screenContainer {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    margin: 0 0.5rem 0.5rem;
    min-height: 0;
    max-height: 100%;
    border-radius: 0.75rem;

    &.hidden {
      display: none;
    }
  }

  .participantsPane {
    display: flex;
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0.5rem;
  }
  .participantsPane :global(.participants-grid) {
    width: 100%;
    height: 100%;
    max-width: 100%;
    --participants-gap: var(--spacing-1);
  }
</style>
