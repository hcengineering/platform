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
  import { type BlobMetadata, getFileUrl } from '@hcengineering/presentation'

  export let value: Ref<Blob>
  export let name: string
  export let contentType: string
  export let metadata: BlobMetadata | undefined

  $: src = value === undefined ? '' : getFileUrl(value, 'full', name)
</script>

{#if src}
  <img class="w-full h-full img-fit" {src} alt="" />
{/if}

<style lang="scss">
  .img-fit {
    margin: 0 auto;
    width: fit-content;
    height: fit-content;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
</style>
