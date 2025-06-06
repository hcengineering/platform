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
  export let src: string
  export let name: string | undefined = undefined
  export let preload = true

  let video: HTMLVideoElement
</script>

<video bind:this={video} {src} width="100%" height="100%" preload={preload ? 'auto' : 'none'} controls>
  <track kind="captions" label={name ?? ''} />
</video>

<style lang="scss">
  video {
    border-radius: inherit;
    object-fit: contain;
  }

  video::-webkit-media-controls {
    visibility: hidden;
  }

  video::-webkit-media-controls-enclosure {
    visibility: visible;
  }
</style>
