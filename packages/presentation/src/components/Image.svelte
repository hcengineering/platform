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
  import { Image } from '@hcengineering/ui'
  import { getBlobRef } from '../preview'

  export let blob: Ref<Blob>
  export let alt: string = ''
  export let fit: string = 'contain'
  export let width: number
  export let height: number
  export let responsive: boolean = false
</script>

{#await getBlobRef(blob, alt, width, height) then blobSrc}
  <Image
    src={blobSrc.src}
    srcset={blobSrc.srcset}
    {alt}
    width={responsive ? '100%' : width}
    height={responsive ? '100%' : height}
    {fit}
    on:load
    on:error
  />
{/await}
