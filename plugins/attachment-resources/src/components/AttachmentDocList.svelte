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
  import { type Doc, type Ref, type WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { onMount } from 'svelte'

  import attachment from '../plugin'
  import { AttachmentImageSize } from '../types'
  import AttachmentGroup from './AttachmentGroup.svelte'
  import { loadSavedAttachments, savedAttachmentsStore } from '../stores'

  export let value: Doc & { attachments?: number }
  export let attachments: Attachment[] | undefined = undefined
  export let imageSize: AttachmentImageSize = 'x-large'
  export let videoPreload = true
  export let isOwn = false

  const query = createQuery()

  let savedAttachmentsIds: Ref<Attachment>[] = []
  let resAttachments: WithLookup<Attachment>[] = []

  $: savedAttachmentsIds = $savedAttachmentsStore.map((it) => it.attachedTo)

  $: updateQuery(value, attachments)

  function updateQuery (value: Doc & { attachments?: number }, attachments?: Attachment[]): void {
    if (attachments !== undefined && attachments.length > 0) {
      resAttachments = attachments
      return
    }
    if (value && value.attachments && value.attachments > 0) {
      query.query(
        attachment.class.Attachment,
        {
          attachedTo: value._id
        },
        (res) => {
          resAttachments = res
        },
        {
          showArchived: true
        }
      )
    } else {
      resAttachments = []
    }
  }

  onMount(() => {
    loadSavedAttachments()
  })
</script>

<AttachmentGroup attachments={resAttachments} {savedAttachmentsIds} {imageSize} {videoPreload} {isOwn} />
