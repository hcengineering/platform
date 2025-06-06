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
  import { ComponentExtensions } from '@hcengineering/presentation'
  import media from '../plugin'
  import { state, sessions } from '../stores'

  import CamStateButton from './CamStateButton.svelte'
  import MicStateButton from './MicStateButton.svelte'
  import MediaSettingsButton from './MediaSettingsButton.svelte'

  // When running not in secure context, we cannot get access
  // to the media devices, so we disable the configuration button
  const hasMediaDevices = navigator?.mediaDevices !== undefined
  let anchor: HTMLElement

  $: active = $sessions.length > 0
</script>

<div bind:this={anchor} class="flex-row-center hot-controls-container">
  {#if active}
    <div class="flex-row-center controls-container flex-gap-0-5">
      <MicStateButton state={$state.microphone} />
      <CamStateButton state={$state.camera} />

      <ComponentExtensions extension={media.extension.StateIndicator} on:close />
    </div>
  {/if}
  <MediaSettingsButton disabled={!hasMediaDevices} {anchor} />
</div>

<style lang="scss">
  .hot-controls-container {
    gap: 1px;

    .controls-container {
      padding: 0.125rem;
      height: 1.75rem;
      background-color: var(--theme-state-positive-background-color);
      border-radius: 0.375rem 0 0 0.375rem;
    }
  }
</style>
