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
  import { Button, IconStop } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import plugin from '../plugin'
  import { stopRecording } from '../recording'
  import { recording } from '../stores'

  const dispatch = createEventDispatcher()

  let video: HTMLVideoElement | null = null
  $: if (video != null) {
    video.srcObject = $recording?.stream ?? null
  }

  async function handleStop (): Promise<void> {
    await stopRecording()
    dispatch('close')
  }
</script>

<div class="antiPopup antiPopup-withHeader thinStyle">
  <div class="ap-space" />

  <div class="ap-header">
    <div class="ap-space x2" />

    <div class="preview">
      <!-- svelte-ignore a11y-media-has-caption -->
      <video bind:this={video} width="100%" height="100%" autoplay muted />
    </div>
  </div>

  <div class="ap-space" />

  <div class="ap-scroll">
    <div class="ap-box">
      <div class="p-2 flex-row-center justify-end flex-grow">
        <Button
          label={plugin.string.Stop}
          kind={'negative'}
          icon={IconStop}
          iconProps={{ size: 'large' }}
          padding={'0 .5rem 0 .25rem'}
          on:click={handleStop}
        />
      </div>

      <div class="ap-space" />
    </div>
  </div>
</div>

<style lang="scss">
  .icon {
    padding: 0.25rem;
  }

  .preview {
    border-radius: 0.25rem;
    border: 1px solid var(--theme-divider-color);
    min-width: 15rem;
    max-width: 20rem;
  }

  video {
    border-radius: inherit;
  }
</style>
