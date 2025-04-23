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
  import { IconCheck, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import media from '../plugin'

  export let devices: MediaDeviceInfo[]
  export let selected: MediaDeviceInfo | null = null

  const dispatch = createEventDispatcher()

  let current: MediaDeviceInfo | null = selected

  function handleDeviceChange (device: MediaDeviceInfo | null): void {
    if (current?.deviceId !== device?.deviceId) {
      dispatch('update', device?.deviceId ?? null)
      current = device
    }
  }
</script>

<div class="antiPopup antiPopup-withHeader thinStyle">
  <div class="ap-space" />

  <div class="ap-header">
    <div class="ap-caption">
      <Label label={media.string.Microphone} />
    </div>
  </div>

  <div class="ap-space" />

  <div class="ap-scroll">
    <div class="ap-box">
      {#each devices as device}
        <div class="ap-menuItem separator halfMargin" />

        <button
          class="ap-menuItem noMargin withIcon flex-row-center flex-grow"
          on:click={() => {
            handleDeviceChange(device)
          }}
        >
          <div class="flex-between flex-grow flex-gap-2">
            <div class="flex-row-center">
              <span class="label overflow-label font-medium">{device.label}</span>
            </div>

            {#if current?.deviceId === device.deviceId}
              <div class="check">
                <IconCheck size={'small'} />
              </div>
            {/if}
          </div>
        </button>
      {/each}

      <div class="ap-space" />
    </div>
  </div>
</div>

<style lang="scss">
  .antiPopup {
    width: 20rem;
  }
</style>
