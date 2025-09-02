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
  import { Image, lazyObserverContinuous } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import { getBlobRef } from '../preview'

  export let blob: Ref<Blob>
  export let alt: string | undefined = undefined
  export let fit: string = 'contain'
  export let width: number
  export let height: number
  export let responsive: boolean = false
  export let loading: 'lazy' | 'eager' = 'eager'

  const dispatch = createEventDispatcher()

  let blobSrc: { src: string, srcset: string } | undefined

  $: void getBlobRef(blob, alt, width, height).then((val) => {
    blobSrc = val
  })

  let visible = true
  let loaded = false

  function trackVisible (node: Element): any {
    return lazyObserverContinuous(
      node,
      (val) => {
        visible = val
      },
      '10%'
    )
  }

  $: src = visible || loaded ? blobSrc?.src : undefined
  $: srcset = visible || loaded ? blobSrc?.srcset : undefined

  function handleLoad (): void {
    loaded = true
    dispatch('load')
  }

  function handleLoadStart (): void {
    loaded = false
    dispatch('loadstart')
  }

  function handleError (): void {
    loaded = false
    dispatch('error')
  }
</script>

<div use:trackVisible>
  <Image
    {src}
    {srcset}
    {alt}
    width={responsive ? '100%' : width}
    height={responsive ? '100%' : height}
    {loading}
    {fit}
    on:load={handleLoad}
    on:loadstart={handleLoadStart}
    on:error={handleError}
  />
</div>
