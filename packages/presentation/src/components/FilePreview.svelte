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
  import { Button, Component, Label } from '@hcengineering/ui'

  import presentation from '../plugin'

  import { getPreviewType, previewTypes } from '../file'
  import { BlobMetadata, FilePreviewExtension } from '../types'

  import { getBlobSrcFor } from '../preview'

  export let file: Blob
  export let name: string
  export let metadata: BlobMetadata | undefined
  export let props: Record<string, any> = {}

  let download: HTMLAnchorElement

  let previewType: FilePreviewExtension | undefined = undefined
  $: void getPreviewType(file.contentType, $previewTypes).then((res) => {
    previewType = res
  })
  $: srcRef = getBlobSrcFor(file, name)
</script>

{#await srcRef then src}
  {#if src === ''}
    <div class="centered">
      <Label label={presentation.string.FailedToPreview} />
    </div>
  {:else if previewType !== undefined}
    <div class="content flex-col flex-grow">
      <Component
        is={previewType.component}
        props={{ value: file, name, contentType: file.contentType, metadata, ...props }}
      />
    </div>
  {:else}
    <div class="centered flex-col flex-gap-3">
      <Label label={presentation.string.ContentTypeNotSupported} />
      <a class="no-line" href={src} download={name} bind:this={download}>
        <Button
          label={presentation.string.Download}
          kind={'primary'}
          on:click={() => {
            download.click()
          }}
          showTooltip={{ label: presentation.string.Download }}
        />
      </a>
    </div>
  {/if}
{/await}

<style lang="scss">
  .content {
    flex-grow: 1;
    overflow: auto;
    border: none;
  }
  .centered {
    flex-grow: 1;
    width: 100;
    height: 100;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
