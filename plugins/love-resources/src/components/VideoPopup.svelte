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
  import { Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import ParticipantsListView from './meeting/ParticipantsListView.svelte'
  import ScreenSharingView from './meeting/ScreenSharingView.svelte'

  export let isDock: boolean = false
  export let room: Ref<TypeRoom>

  const dispatch = createEventDispatcher()

  let withScreenSharing: boolean = false
  let divScroll: HTMLElement

  const dispatchFit = (_?: boolean): void => {
    setTimeout(() => {
      if (divScroll) {
        const notFit: number = divScroll.scrollHeight - divScroll.clientHeight
        dispatch('changeContent', { notFit })
      }
    }, 10)
  }

  $: dispatchFit(withScreenSharing)
</script>

<div class="antiPopup videoPopup-container" class:isDock>
  <div class="screenContainer" class:hidden={!withScreenSharing}>
    <ScreenSharingView showLocalTrack={false} bind:hasActiveTrack={withScreenSharing} />
  </div>
  <Scroller
    bind:divScroll
    noStretch
    padding={'.5rem'}
    containerName={'videoPopupСontainer'}
    onResize={dispatchFit}
    stickedScrollBars
  >
    <div class="videoGrid">
      <ParticipantsListView
        {room}
        on:participantsCount={(evt) => {
          dispatchFit(evt.detail > 0)
        }}
      />
    </div>
  </Scroller>
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

  .videoGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-flow: row;
    gap: var(--spacing-1);
  }
  @container videoPopupСontainer (max-width: 60rem) {
    .videoGrid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @container videoPopupСontainer (max-width: 30rem) {
    .videoGrid {
      grid-template-columns: 1fr;
    }
  }
</style>
