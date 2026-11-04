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
  import presentation, { fetchPreviewFile, getPrintContext } from '@hcengineering/presentation'
  import { Label, Loading, Scroller, trackRenderResource } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  export let value: Ref<Blob>
  export let name: string
  export let fit: boolean = false
  export let sourceLink: string | undefined = undefined
  const staticView = getPrintContext() !== undefined
  let loading = true
  let failed = false
  let text = ''
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
    loading = true
    failed = false
    try {
      const response = await fetchPreviewFile(value, name, { signal: abort.signal })
      const content = await response.text()
      if (request !== generation) return
      text = content
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
  <div class="flex-center w-full h-full clear-mins"><Loading /></div>
{:else if staticView}
  <pre class="select-text static-text">{text}</pre>
{:else}
  <div class="container h-full w-full" class:fit>
    <Scroller horizontal padding="0 1rem">
      <pre class="select-text">{text}</pre>
    </Scroller>
  </div>
{/if}

<style lang="scss">
  .container {
    max-height: 80vh;
    overflow: hidden;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    &.fit {
      min-height: 100%;
    }
    &:not(.fit) {
      height: 80vh;
      min-height: 20rem;
    }
  }
  pre {
    font-family: var(--mono-font);
    white-space: pre;
    font-size: 0.8125rem;
  }
  .static-text {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
