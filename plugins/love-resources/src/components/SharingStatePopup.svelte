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
  import { IntlString } from '@hcengineering/platform'
  import { Button, Icon, IconStop, Label } from '@hcengineering/ui'
  import { Track } from 'livekit-client'
  import { createEventDispatcher, onMount } from 'svelte'

  import love from '../plugin'
  import { liveKitClient, lk } from '../utils'

  import IconShare from './icons/Share.svelte'

  const dispatch = createEventDispatcher()

  const labels: Record<string, IntlString> = {
    browser: love.string.Browser,
    monitor: love.string.Monitor,
    window: love.string.Window
  }

  let video: HTMLVideoElement | null = null

  let track: MediaStreamTrack | undefined = undefined
  let settings: MediaTrackSettings | undefined = undefined

  onMount(async () => {
    const pubs = lk.localParticipant.getTrackPublications()
    const pub = pubs.find((p) => p.isLocal && p.kind === Track.Kind.Video && p.source === Track.Source.ScreenShare)
    track = pub?.track?.mediaStreamTrack
    settings = track?.getSettings()
  })

  $: if (video != null) {
    if (track != null) {
      const stream = new MediaStream()
      stream.addTrack(track)
      video.srcObject = stream
    } else {
      video.srcObject = null
    }
  }

  function handleStop (): void {
    void liveKitClient.setScreenShareEnabled(false)
    dispatch('close')
  }
</script>

<div class="antiPopup antiPopup-withHeader thinStyle">
  <div class="ap-space" />

  <div class="ap-header">
    {#if track !== null}
      <div class="ap-space x2" />

      <div class="preview">
        <!-- svelte-ignore a11y-media-has-caption -->
        <video bind:this={video} width="100%" height="100%" autoplay muted />
      </div>
    {/if}
  </div>

  <div class="ap-space" />

  <div class="ap-scroll">
    <div class="ap-box">
      <div class="p-2 flex-between flex-grow flex-gap-2">
        <div class="flex-row-center flex-gap-2">
          <div class="icon">
            <Icon icon={IconShare} size={'small'} />
          </div>
          <div class="flex-col">
            <span class="label overflow-label font-medium caption-color">
              <Label label={love.string.Sharing} />
            </span>
            {#if settings?.displaySurface !== undefined}
              {@const label = labels[settings.displaySurface]}
              {#if label !== undefined}
                <span class="label overflow-label font-medium">
                  <Label {label} />
                </span>
              {/if}
            {/if}
          </div>
        </div>

        <Button
          label={love.string.StopShare}
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
