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

<AttachmentList attachments={otherAttachments} {savedAttachmentsIds} {imageSize} {videoPreload} />
<LinkPreviewList attachments={linkPreviewAttachments} />
