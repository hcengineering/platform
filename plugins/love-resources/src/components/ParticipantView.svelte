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
  import { Icon, Loading, resizeObserver } from '@hcengineering/ui'
  import love from '../plugin'

  export let _id: string
  export let name: string
  export let muted: boolean
  export let mirror: boolean
  export let connecting: boolean = false
  export let small: boolean = false

  let parent: HTMLDivElement
  let activeTrack: boolean = false
  let filled: boolean = false

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

  let labelWidth: number
  let parentWidth: number
  $: filled = labelWidth === parentWidth && labelWidth > 0
  $: user = $personByIdStore.get(_id as Ref<Person>)
</script>

<div
  id={_id}
  class="parent"
  class:small
  use:resizeObserver={(element) => {
    parentWidth = element.clientWidth
  }}
>
  <div
    class="label"
    class:filled
    use:resizeObserver={(element) => {
      labelWidth = element.clientWidth
    }}
  >
    <span class="overflow-label">{formatName(name)}</span>
    {#if connecting}
      <div class="loading">
        <Loading size={'small'} />
      </div>
    {/if}
    <div class="icon" class:muted>
      <Icon size="small" icon={love.icon.MicDisabled} />
    </div>
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
      height: 25%;
      aspect-ratio: 1;
      border-radius: 20%;
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

    .label {
      position: absolute;
      top: 0;
      left: 0;
      max-width: 100%;
      padding: 0.5rem 0.5rem 0.25rem 1rem;
      color: white;
      font-weight: 500;
      background-color: rgba(0, 0, 0, 0.3);
      border-radius: 0.75rem 0 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      z-index: 1;
      text-overflow: ellipsis;
      overflow: hidden;

      span {
        text-shadow: 0 0 0.25rem black;
      }
      &.filled {
        padding: 0.5rem 1rem 0.25rem 1rem;
        border-radius: 0.75rem 0.75rem 0 0;
      }
    }
    &.small .label {
      font-size: 0.75rem;
      padding: 0.25rem 0.25rem 0.25rem 0.5rem;

      &.filled {
        padding: 0.25rem 0.5rem;
      }
    }
  }

  .icon {
    &:not(.muted) {
      display: none;
    }
  }
</style>
