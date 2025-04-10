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
  import attachment, { type Attachment, type Drawing } from '@hcengineering/attachment'
  import core, { SortingOrder } from '@hcengineering/core'
  import { DrawingData, FilePreviewPopup, getClient } from '@hcengineering/presentation'
  import { isAttachment } from '../utils'

  export let value: Attachment

  export let fullSize = false
  export let showIcon = true

  $: drawingAvailable = value?.type?.startsWith('image/') && isAttachment(value)

  async function loadDrawings (): Promise<Drawing[]> {
    const client = getClient()
    const drawings = await client.findAll(
      attachment.class.Drawing,
      {
        parent: value.file,
        space: value.space
      },
      {
        sort: {
          createdOn: SortingOrder.Descending
        },
        limit: 1
      }
    )

    return Array.from(drawings ?? [])
  }

  async function createDrawing (data: DrawingData): Promise<DrawingData> {
    const client = getClient()
    const newId = await client.createDoc(attachment.class.Drawing, value.space, {
      parent: value.file,
      parentClass: core.class.Blob,
      content: data.content
    })
    const newDrawing = await client.findOne(attachment.class.Drawing, { _id: newId })
    if (newDrawing === undefined) {
      throw new Error('Unable to find just created drawing')
    }
    return newDrawing
  }
</script>

<FilePreviewPopup
  file={value.file}
  name={value.name}
  metadata={value.metadata}
  contentType={value.type}
  props={{
    drawingAvailable,
    loadDrawings,
    createDrawing
  }}
  {fullSize}
  {showIcon}
  on:open
  on:close
  on:update
  on:fullsize
/>
