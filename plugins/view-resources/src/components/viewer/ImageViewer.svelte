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
  import { getBlobRef, type BlobMetadata } from '@hcengineering/presentation'

  export let value: Blob | Ref<Blob>
  export let name: string
  export let metadata: BlobMetadata | undefined
  export let fit: boolean = false

  $: p = typeof value === 'string' ? getBlobRef(undefined, value, name) : getBlobRef(value, value._id)
  $: width = metadata?.originalWidth ? `min(${metadata.originalWidth / metadata?.pixelRatio ?? 1}px, 100%)` : '100%'
  $: height = metadata?.originalHeight
    ? `min(${metadata.originalHeight / metadata?.pixelRatio ?? 1}px, ${fit ? '100%' : '80vh'})`
    : '100%'
</script>

{#await p then blobRef}
  <img
    class="object-contain mx-auto"
    style:max-width={width}
    style:max-height={height}
    src={blobRef.src}
    srcset={blobRef.srcset}
    alt={name}
  />
{/await}
