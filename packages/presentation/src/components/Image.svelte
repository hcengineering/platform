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
  import type { Blob, Ref } from '@hcengineering/core'
  import { Blurhash, Image, Loading } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getBlobRef } from '../preview'

  export let blob: Ref<Blob>
  export let alt: string | undefined = undefined
  export let fit: string = 'contain'
  export let width: number
  export let height: number
  export let responsive: boolean = false
  export let loading: 'lazy' | 'eager' = 'eager'
  export let blurhash: string | undefined = undefined
  export let showLoading: boolean = false

  const dispatch = createEventDispatcher()

  let blobSrc: { src: string, srcset: string } | undefined

  $: void getBlobRef(blob, alt, width, height).then((val) => {
    blobSrc = val
  })

  let loaded = false

  function handleLoad (): void {
    loaded = true
    dispatch('load')
  }

  function handleLoadStart (): void {
    loaded = false
    dispatch('loadstart')
  }
</script>

<div class="container relative w-full h-full">
  {#if !loaded}
    {#if blurhash !== undefined}
      <div class="overlay">
        <Blurhash {blurhash} {width} {height} />
      </div>
    {:else if showLoading}
      <div class="overlay">
        <Loading />
      </div>
    {/if}
  {/if}

  <Image
    src={blobSrc?.src}
    srcset={blobSrc?.srcset}
    {alt}
    width={responsive ? '100%' : width}
    height={responsive ? '100%' : height}
    {loading}
    {fit}
    on:error
    on:load={handleLoad}
    on:loadstart={handleLoadStart}
  />
</div>

<style lang="scss">
  .container {
    border-radius: inherit;
  }
  .overlay {
    border-radius: inherit;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
