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
  import { createEventDispatcher, onMount } from 'svelte'
  import { AttachmentStyleBoxEditor } from '@hcengineering/attachment-resources'
  import { MessageViewer, getClient } from '@hcengineering/presentation'
  import { EditBox, Grid } from '@hcengineering/ui'
  import { checkMyPermission, permissionsStore } from '@hcengineering/contact-resources'
  import documents, { DocumentCategory } from '@hcengineering/controlled-documents'

  import document from '../plugin'

  export let object: DocumentCategory
  export let readonly: boolean = false

  const dispatch = createEventDispatcher()
  const client = getClient()

  let title = object.title
  let category = object.code

  $: canEdit =
    !readonly && checkMyPermission(documents.permission.UpdateDocumentCategory, object.space, $permissionsStore)

  async function saveField (ev: Event, val: string, field: string): Promise<void> {
    ev.preventDefault()

    if (object === undefined) {
      return
    }

    const trimmed = val.trim()
    if (trimmed.length > 0 && trimmed !== (object as any)[field]) {
      await client.update(object, { [field]: trimmed })
    }
  }

  $: descriptionKey = client.getHierarchy().getAttribute(document.class.DocumentCategory, 'description')

  onMount(() => {
    dispatch('open', { ignoreKeys: ['code', 'title', 'description', 'attachments'] })
  })
</script>

<Grid column={1} rowGap={1.5}>
  <span class="fs-title flex-row-center">
    <EditBox
      bind:value={category}
      disabled={!canEdit}
      placeholder={document.string.Category}
      kind="large-style"
      on:blur={(evt) => saveField(evt, category, 'code')}
    />

    <div class="p-1">-</div>

    <EditBox
      bind:value={title}
      disabled={!canEdit}
      placeholder={document.string.DomainTitle}
      kind="large-style"
      on:blur={(evt) => saveField(evt, title, 'title')}
    />
  </span>

  {#if !canEdit}
    <MessageViewer message={object.description ?? ''} />
  {:else}
    <AttachmentStyleBoxEditor
      {object}
      key={{ key: 'description', attr: descriptionKey }}
      placeholder={document.string.Description}
    />
  {/if}
</Grid>
