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
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { Loading } from '@hcengineering/ui'
  import love from '../plugin'
  import MicDisabled from './icons/MicDisabled.svelte'

  export let _id: string
  export let name: string
  export let muted: boolean
  export let mirror: boolean
  export let connecting: boolean = false

  let parent: HTMLDivElement
  let activeTrack: boolean = false

  export function appendChild (track: HTMLMediaElement): void {
    const video = parent.querySelector('.video')
    if (video != null) {
      video.remove()
    }

    track.classList.add('video')
    parent.appendChild(track)
    activeTrack = true
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

  $: user = $personByIdStore.get(_id as Ref<Person>)
</script>

<div id={_id} class="parent">
  <div class="label">
    <span class="overflow-label">{formatName(name)}</span>
  </div>
  <div class="icon" class:shown={muted || connecting}>
    {#if connecting}<Loading size={'small'} shrink />{/if}
    {#if muted}<MicDisabled size={'small'} />{/if}
  </div>
  <div bind:this={parent} class="cover" class:active={activeTrack} class:mirror={mirror && activeTrack}>
    <div class="ava">
      <Avatar size={'full'} {name} person={user} showStatus={false} />
    </div>
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
    aspect-ratio: 1280/720;
    display: flex;
    justify-content: center;
    align-items: center;

    &.mirror {
      transform: scaleX(-1);
    }

    .ava {
      overflow: hidden;
      position: absolute;
      height: 50%;
      aspect-ratio: 1;
      border-radius: 50%;
    }
    &.active > .ava {
      display: none;
    }
    &:not(.active) {
      background-color: black;
    }
  }
  .parent {
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
    height: max-content;
    min-height: 0;
    max-height: 100%;

    .label,
    .icon {
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0.25rem 0.5rem;
      height: 1.5rem;
      color: rgba(0, 0, 0, 0.75);
      background-color: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(3px);
      z-index: 1;
    }
    .label {
      overflow: hidden;
      top: 0;
      left: 0;
      max-width: 12rem;
      font-weight: 500;
      font-size: 0.75rem;
      line-height: 1rem;
      border-radius: 0.75rem 0 0.5rem 0;
    }
    .icon {
      display: none;
      bottom: 0;
      right: 0;
      flex-shrink: 0;
      gap: 0.25rem;
      border-radius: 0.5rem 0 0.75rem 0;

      &.shown {
        display: flex;
      }
    }
  }
</style>
