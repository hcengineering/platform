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
  import { Person, formatName } from '@hcengineering/contact'
  import { Avatar, getPersonByPersonRefStore } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { Loading } from '@hcengineering/ui'

  import { currentRoomAudioLevels } from '../utils'
  import MicDisabled from './icons/MicDisabled.svelte'

  export let _id: string
  export let name: string
  export let muted: boolean
  export let mirror: boolean
  export let connecting: boolean = false

  let parent: HTMLDivElement
  let activeTrack: boolean = false

  export function appendChild (track: HTMLMediaElement, enabled: boolean = true): void {
    const video = parent.querySelector('.video')
    if (video != null) {
      video.remove()
    }

    track.classList.add('video')
    if (!enabled) track.classList.add('hidden')
    parent.appendChild(track)
    activeTrack = enabled
  }

  export function setTrackMuted (value: boolean): void {
    const video = parent.querySelector('video')
    if (video != null) {
      if (value) {
        video.classList.add('hidden')
      } else {
        video.classList.remove('hidden')
      }
    }
    activeTrack = !value
  }

  $: personByRefStore = getPersonByPersonRefStore([_id as Ref<Person>])
  $: user = $personByRefStore.get(_id as Ref<Person>)

  $: speach = $currentRoomAudioLevels.get(_id as Ref<Person>) ?? 0
</script>

<div id={_id} class="parent" class:speach={speach > 0}>
  <div bind:this={parent} class="cover" class:active={activeTrack} class:mirror={mirror && activeTrack} />
  <div class="ava">
    <Avatar size={'full'} {name} person={user} showStatus={false} />
  </div>
  <div class="label" class:withIcon={muted || connecting}>
    {#if connecting}<Loading size={'small'} shrink />{/if}
    {#if muted}<MicDisabled fill={'var(--bg-negative-default)'} size={'small'} />{/if}
    <span class="overflow-label">{formatName(name)}</span>
  </div>
</div>

<style lang="scss">
  :global(.video) {
    object-fit: cover;
    border-radius: 0.75rem;
    height: 100%;
    width: 100%;
  }
  :global(.hidden) {
    display: none;
  }
  .cover {
    object-fit: cover;
    border-radius: 0.75rem;
    height: 100%;
    width: 100%;
    aspect-ratio: 1280 / 720;
    display: flex;
    justify-content: center;
    align-items: center;

    &.mirror {
      transform: scaleX(-1);
    }

    &.active + .ava {
      display: none;
    }
    &:not(.active) {
      background-color: black;
    }
  }
  .ava {
    overflow: hidden;
    position: absolute;
    top: 50%;
    left: 50%;
    height: 50%;
    aspect-ratio: 1;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }
  .parent {
    position: relative;
    flex-shrink: 0;
    height: max-content;
    min-height: 0;
    max-height: 100%;
    background-color: black;
    border-radius: 0.75rem;

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      top: 0.25rem;
      left: 0.25rem;
      max-width: 12rem;
      font-weight: 500;
      font-size: 0.75rem;
      line-height: 1rem;
      color: var(--white-color);
      background-color: rgba(0, 0, 0, 0.5);
      border-radius: 0.5rem;
      backdrop-filter: blur(3px);

      &.withIcon {
        padding-left: 0.25rem;
      }
    }
    &.speach::before,
    &.speach::after {
      position: absolute;
      content: '';
      inset: 0;
      border-radius: 0.75rem;
      z-index: 1;
    }
    &.speach::before {
      border: 3px solid var(--border-talk-indication-secondary);
    }
    &.speach::after {
      border: 2px solid var(--border-talk-indication-primary);
    }
  }
</style>
