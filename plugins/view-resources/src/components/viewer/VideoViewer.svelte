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
  import { getFileUrl, type BlobMetadata } from '@hcengineering/presentation'

  export let value: Ref<Blob>
  export let name: string
  export let metadata: BlobMetadata | undefined
  export let fit: boolean = false

  $: maxWidth = metadata?.originalWidth ? `min(${metadata.originalWidth}px, 100%)` : undefined
  $: maxHeight = metadata?.originalHeight ? `min(${metadata.originalHeight}px, 80vh)` : undefined

  $: src = getFileUrl(value, name)
</script>

<video style:max-width={fit ? '100%' : maxWidth} style:max-height={fit ? '100%' : maxHeight} controls preload={'auto'}>
  <source {src} />
  <track kind="captions" label={name} />
</video>
