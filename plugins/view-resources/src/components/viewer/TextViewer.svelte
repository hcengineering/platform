<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import presentation, { getFileUrl } from '@hcengineering/presentation'
  import { Label, Loading, Scroller } from '@hcengineering/ui'

  export let value: Ref<Blob>
  export let name: string
  export let fit: boolean = false

  $: void fetchFile(value, name)

  let loading = true
  let error = false
  let text: string | undefined = undefined

  async function fetchFile (value: Ref<Blob>, name: string): Promise<void> {
    loading = true
    error = false

    try {
      const src = getFileUrl(value, name)
      const res = await fetch(src)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      text = await res.text()
    } catch (err) {
      console.warn('Failed to fetch file', err)
      error = true
    } finally {
      loading = false
    }
  }
</script>

{#if loading}
  <div class="flex-center w-full h-full clear-mins">
    <Loading />
  </div>
{:else if error}
  <div class="flex-center w-full h-full clear-mins">
    <Label label={presentation.string.FailedToPreview} />
  </div>
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
    white-space: pre !important;
    word-wrap: nowrap !important;
    font-size: 0.8125rem;
  }
</style>
