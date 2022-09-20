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
  import type { Doc } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import attachment from '../plugin'
  import AttachmentList from './AttachmentList.svelte'

  export let value: Doc & { attachments?: number }

  const query = createQuery()
  let attachments: Attachment[] = []

  $: updateQuery(value)

  function updateQuery (value: Doc & { attachments?: number }): void {
    if (value && value.attachments && value.attachments > 0) {
      query.query(
        attachment.class.Attachment,
        {
          attachedTo: value._id
        },
        (res) => (attachments = res)
      )
    } else {
      attachments = []
    }
  }
</script>

<AttachmentList {attachments} />
