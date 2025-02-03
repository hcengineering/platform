<!--
//
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
//
-->
<script lang="ts">
  import documents, {
    createNewFolder,
    DocumentMeta,
    type DocumentSpace,
    type Project,
    type ProjectDocument
  } from '@hcengineering/controlled-documents'
  import core, { Ref } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { EditBox, FocusHandler, createFocusManager } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  export function canClose (): boolean {
    return name === ''
  }

  export let folder: DocumentMeta | undefined
  export let name: string = ''

  export let space: Ref<DocumentSpace> | undefined
  export let project: Ref<Project<DocumentSpace>> | undefined
  export let parent: Ref<ProjectDocument> | undefined

  const dispatch = createEventDispatcher()
  const client = getClient()

  $: canSave = getTitle(name).length > 0 && (folder !== undefined || space !== undefined)

  function getTitle (value: string): string {
    return value.trim()
  }

  async function create (): Promise<void> {
    const title = getTitle(name)
    if (title.length < 1) {
      return
    }

    if (folder !== undefined) {
      await client.update(folder, { title })
    } else if (space !== undefined) {
      await createNewFolder(client, space, project ?? documents.ids.NoProject, parent, title)
    }
    dispatch('close')
  }

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<Card
  label={folder ? documents.string.RenameFolder : documents.string.CreateFolder}
  okAction={create}
  accentHeader
  {canSave}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center clear-mins">
    <EditBox placeholder={core.string.Name} bind:value={name} autoFocus focusIndex={1} />
  </div>
</Card>
