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
  import { Ref, type WithLookup } from '@hcengineering/core'
  import { ListSelectionProvider } from '@hcengineering/view-resources'
  import { updatePopup } from '@hcengineering/ui'
  import { AttachmentImageSize } from '../types'
  import AttachmentPreview from './AttachmentPreview.svelte'

  export let attachments: WithLookup<Attachment>[] = []
  export let savedAttachmentsIds: Ref<Attachment>[] = []
  export let imageSize: AttachmentImageSize | undefined = undefined
  export let videoPreload = false

  let attachmentPopupId = ''

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0) => {
    const current = listProvider.current()
    if (current === undefined) return
    let pos = current + offset
    if (pos < 0) pos = 0
    if (pos >= attachments.length) pos = attachments.length - 1
    const doc = listProvider.docs()[pos] as Attachment
    if (doc !== undefined && attachmentPopupId !== '') {
      listProvider.updateFocus(doc)
      updatePopup(attachmentPopupId, { props: { value: doc } })
    }
  })
  $: listProvider.update(attachments.filter((p) => p.type.startsWith('image/')))
</script>

{#if attachments.length}
  <div class="gallery">
    {#each attachments as attachment}
      <AttachmentPreview
        value={attachment}
        isSaved={savedAttachmentsIds?.includes(attachment._id) ?? false}
        {imageSize}
        {videoPreload}
        {listProvider}
        on:open={(res) => (attachmentPopupId = res.detail)}
      />
    {/each}
  </div>
{/if}

<style lang="scss">
  .gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
</style>
