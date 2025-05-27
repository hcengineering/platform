<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { Button, IconClose } from '@hcengineering/ui'
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import { createEventDispatcher } from 'svelte'

  import { type CameraSize } from '../types'

  import IconCircleLarge from './icons/CircleLarge.svelte'
  import IconCircleMedium from './icons/CircleMedium.svelte'
  import IconCircleSmall from './icons/CircleSmall.svelte'

  export let stream: MediaStream | null
  export let isCamEnabled: boolean = true
  export let size: CameraSize = 'medium'

  const me = getCurrentEmployee()
  const meName = $personByIdStore.get(me)?.name
  const meAvatar = $personByIdStore.get(me)

  const dispatch = createEventDispatcher()

  let video: HTMLVideoElement

  $: if (video != null && video.srcObject !== stream) {
    video.srcObject = stream
  }

  function handleCloseCamera (): void {
    dispatch('close')
  }

  function handleCameraSizeSmall (): void {
    size = 'small'
  }

  function handleCameraSizeMedium (): void {
    size = 'medium'
  }

  function handleCameraSizeLarge (): void {
    size = 'large'
  }
</script>

<div class="container {size}">
  {#if stream != null && isCamEnabled}
    <!-- svelte-ignore a11y-media-has-caption -->
    <video bind:this={video} autoplay muted playsinline disablepictureinpicture />
  {:else}
    <Avatar variant={'circle'} size={'full'} name={meName} person={meAvatar} showStatus={false} adaptiveName />
  {/if}

  <div class="controls">
    <div class="buttons-panel">
      <Button icon={IconClose} kind={'icon'} size={'small'} noFocus on:click={handleCloseCamera} />

      <div class="divider" />

      <Button
        icon={IconCircleSmall}
        kind={'icon'}
        size={'small'}
        selected={size === 'small'}
        noFocus
        on:click={handleCameraSizeSmall}
      />

      <Button
        icon={IconCircleMedium}
        kind={'icon'}
        size={'small'}
        selected={size === 'medium'}
        noFocus
        on:click={handleCameraSizeMedium}
      />

      <Button
        icon={IconCircleLarge}
        kind={'icon'}
        size={'small'}
        selected={size === 'large'}
        noFocus
        on:click={handleCameraSizeLarge}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .container {
    position: relative;
    transition: all 0.2s ease;

    video {
      border-radius: 50%;
      object-fit: cover;
      width: 100%;
      height: 100%;
      background-color: var(--theme-bg-color);

      transform: rotateY(180deg);
    }

    &.small {
      width: 12rem;
      height: 12rem;
    }

    &.medium {
      width: 18rem;
      height: 18rem;
    }

    &.large {
      width: 27rem;
      height: 27rem;
    }

    .controls {
      visibility: hidden;
    }

    &:hover {
      .controls {
        visibility: visible;
      }
    }
  }

  .controls {
    position: absolute;
    width: 100%;
    height: 25%;
    bottom: 0;
    z-index: auto;

    display: flex;
    flex-direction: col;
    align-items: start;
    justify-content: center;
  }

  .buttons-panel {
    display: flex;
    align-items: center;
    border-radius: 0.5rem;
    border: 1px solid var(--button-border-color);
    background-color: var(--theme-bg-color);
    gap: 0.125rem;
    padding: 0.125rem;
  }

  .divider {
    width: 1px;
    background-color: var(--theme-divider-color);
    align-self: stretch;
  }
</style>
