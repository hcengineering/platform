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
  import { createEventDispatcher } from 'svelte'
  import { AttachmentPresenter } from '@hcengineering/attachment-resources'

  import { BlobDraft } from '../../types'

  export let blob: BlobDraft

  const dispatch = createEventDispatcher()
</script>

<div class="item flex">
  <AttachmentPresenter
    value={{
      file: blob.blobId,
      name: blob.fileName,
      type: blob.mimeType,
      size: blob.size,
      metadata: blob.metadata
    }}
    showPreview
    removable
    on:remove={(result) => {
      if (result !== undefined) {
        dispatch('delete', blob.blobId)
      }
    }}
  />
</div>
