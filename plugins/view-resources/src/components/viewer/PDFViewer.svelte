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
  import { getBlobSrcFor, type BlobMetadata } from '@hcengineering/presentation'

  export let value: Blob | Ref<Blob>
  export let name: string
  export let metadata: BlobMetadata | undefined
</script>

{#await getBlobSrcFor(value, name) then href}
  <iframe src={href + '#view=FitH&navpanes=0'} title={name} />
{/await}

<style lang="scss">
  iframe {
    width: 100%;
    height: 80vh;
    min-height: 20rem;
    border: none;
  }
</style>
