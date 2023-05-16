<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Attachment } from '@hcengineering/attachment'
  import { Ref } from '@hcengineering/core'
  import { Scroller } from '@hcengineering/ui'
  import AttachmentPreview from './AttachmentPreview.svelte'

  export let attachments: Attachment[] = []
  export let savedAttachmentsIds: Ref<Attachment>[] = []
</script>

{#if attachments.length}
  <Scroller contentDirection={'horizontal'} horizontal gap={'gap-3'}>
    {#each attachments as attachment}
      <AttachmentPreview value={attachment} isSaved={savedAttachmentsIds?.includes(attachment._id) ?? false} />
    {/each}
  </Scroller>
{/if}
