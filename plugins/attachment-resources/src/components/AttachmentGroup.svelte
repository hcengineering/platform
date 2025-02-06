<!-- //
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
// -->

<script lang="ts">
  import { type Attachment } from '@hcengineering/attachment'
  import { type WithLookup, Ref } from '@hcengineering/core'
  import { AttachmentImageSize } from '../types'
  import AttachmentList from './AttachmentList.svelte'
  import LinkPreviewList from './LinkPreviewList.svelte'

  export let attachments: WithLookup<Attachment>[]
  export let savedAttachmentsIds: Ref<Attachment>[] = []
  export let imageSize: AttachmentImageSize = 'auto'
  export let videoPreload = true
  export let isOwn = false

  let otherAttachments: WithLookup<Attachment>[]
  let linkPreviewAttachments: WithLookup<Attachment>[]

  $: filter(attachments)
  function filter (value: WithLookup<Attachment>[]): void {
    linkPreviewAttachments = []
    otherAttachments = []
    for (const attachment of value) {
      if (attachment === undefined) {
        continue
      }
      if (attachment.type === 'application/link-preview') {
        linkPreviewAttachments.push(attachment)
      } else {
        otherAttachments.push(attachment)
      }
    }
  }
</script>

<div class="gapV-2">
  <AttachmentList attachments={otherAttachments} {savedAttachmentsIds} {imageSize} {videoPreload} />
  <LinkPreviewList attachments={linkPreviewAttachments} {isOwn} />
</div>
