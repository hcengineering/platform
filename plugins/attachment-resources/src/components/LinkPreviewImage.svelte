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
  import { onMount } from 'svelte'

  export let url: string | undefined = undefined
  export let src: string
  export let width: number
  export let height: number | undefined
  export let fit: string

  let previewSrc: string | undefined
  let retryCount = 0

  function refreshPreviewSrc (): void {
    if (src === undefined) {
      previewSrc = undefined
      return
    }
    if (retryCount > 3) {
      previewSrc = undefined
      return
    }
    retryCount++
    previewSrc = `${src}#${Date.now()}`
  }

  onMount(() => {
    refreshPreviewSrc()
  })
</script>

{#if previewSrc}
  {#if url}
    <a target="_blank" href={url}>
      <img
        src={previewSrc}
        class="link-preview__image"
        alt="link-preview"
        width={`${width}px`}
        height={`${height}px`}
        style:object-fit={fit}
        on:error={() => {
          refreshPreviewSrc()
        }}
      />
    </a>
  {:else}
    <img
      src={previewSrc}
      class="link-preview__image"
      alt="link-preview"
      width={`${width}px`}
      height={`${height}px`}
      style:object-fit={fit}
      on:error={() => {
        refreshPreviewSrc()
      }}
    />
  {/if}
{/if}

<style lang="scss">
  .link-preview__image {
    margin-top: 0.5rem;
    border-radius: 0.375rem;
    max-width: 24.5rem;
    max-height: 15rem;
  }
</style>
