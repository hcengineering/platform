<!--
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { type Blob, type Ref } from '@hcengineering/core'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, {
    fetchPreviewFile,
    getCurrentWorkspaceUuid,
    getFileUrl,
    getPreviewMetadata,
    getPreviewThumbnail,
    getPrintContext
  } from '@hcengineering/presentation'
  import { EmbeddedPDF, Label, Loading, trackRenderResource } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import ImageViewer from './ImageViewer.svelte'

  export let value: Ref<Blob>
  export let name: string
  export let fit: boolean = false
  export let sourceLink: string | undefined = undefined
  const staticView = getPrintContext() !== undefined
  let src: string | undefined
  let failed = false
  let loading = true
  let generation = 0
  let controller: AbortController | undefined
  function failedPreview (): void {
    generation++
    controller?.abort()
    failed = true
    loading = false
  }

  const trackLoading = trackRenderResource({ timeoutMs: 15000, onTimeout: failedPreview })
  $: trackLoading(loading)

  async function prepare (value: string, name: string): Promise<void> {
    const request = ++generation
    controller?.abort()
    const abort = new AbortController()
    controller = abort
    src = undefined
    failed = false
    loading = true
    try {
      if (!staticView) {
        src = getFileUrl(value, name)
        loading = false
        return
      }
      await fetchPreviewFile(value, name, { method: 'HEAD', signal: abort.signal })
      if ((getMetadata(presentation.metadata.PreviewUrl) ?? '') === '') throw new Error('Preview unavailable')
      const metadata = await getPreviewMetadata(getCurrentWorkspaceUuid(), value, abort.signal)
      const thumbnail = metadata.thumbnail
      if (thumbnail === undefined || thumbnail.width <= 0 || thumbnail.height <= 0)
        throw new Error('Preview unavailable')
      if (request !== generation) return
      src = getPreviewThumbnail(value, 1200, Math.round((1200 * thumbnail.height) / thumbnail.width), 1)
      loading = false
    } catch {
      if (request === generation) failedPreview()
    }
  }
  $: void prepare(value, name)
  onDestroy(() => {
    generation++
    controller?.abort()
  })
</script>

{#if failed}
  <Label label={presentation.string.FailedToPreview} />:
  {#if sourceLink !== undefined}<a href={sourceLink}>{name}</a>{:else}{name}{/if}
{:else if loading}
  <div class="flex-center w-full clear-mins"><Loading /></div>
{:else if src !== undefined}
  {#if staticView}
    <ImageViewer {value} {name} source={src} metadata={undefined} {sourceLink} />
  {:else}
    <EmbeddedPDF {src} {name} {fit} />
  {/if}
{/if}
