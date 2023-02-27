<!--
// Copyright © 2022 Hardcore Engineering Inc
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
  import { Class, Data, Doc, Ref, Space } from '@hcengineering/core'

  import { getClient } from '@hcengineering/presentation'
  import { createAttachments } from '../utils'
  import attachment from '../plugin'
  import { createEventDispatcher } from 'svelte'

  export let loading: number = 0
  export let objectClass: Ref<Class<Doc>>
  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let attachmentClass: Ref<Class<Attachment>> = attachment.class.Attachment
  export let attachmentClassOptions: Partial<Data<Attachment>> = {}
  export let canDrop: ((e: DragEvent) => boolean) | undefined = undefined

  export let dragover = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function fileDrop (e: DragEvent) {
    dragover = false

    if (canDrop && !canDrop(e)) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    const list = e.dataTransfer?.files
    if (list === undefined || list.length === 0) return

    loading++
    try {
      await createAttachments(client, list, { objectClass, objectId, space }, attachmentClass, attachmentClassOptions)
    } finally {
      loading--
    }

    dispatch('attached')
  }
</script>

<div
  on:dragover={(e) => {
    if (canDrop?.(e) ?? true) {
      dragover = true
      e.preventDefault()
    }
  }}
  on:dragleave={() => {
    dragover = false
  }}
  on:drop={fileDrop}
>
  <slot />
</div>
