<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Doc } from '@hcengineering/core'
  import { Attachment } from '@hcengineering/attachment'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ActionIcon, IconAdd, Label, Loading } from '@hcengineering/ui'
  import { AttachmentPresenter } from '..'
  import attachment from '../plugin'
  import { uploadFile } from '../utils'

  export let attachments: number
  export let object: Doc
  export let canAdd = true
  export let canRemove = true

  const client = getClient()

  let docs: Attachment[] = []

  let progress = false

  const query = createQuery()
  $: query.query(
    attachment.class.Attachment,
    {
      attachedTo: object._id
    },
    (res) => {
      docs = res
    }
  )

  function add () {
    if (canAdd) {
      inputFile.click()
    }
  }

  async function createAttachment (file: File) {
    const uuid = await uploadFile(file)
    await client.addCollection(attachment.class.Attachment, object.space, object._id, object._class, 'attachments', {
      name: file.name,
      file: uuid,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    })
  }

  async function fileSelected (): Promise<void> {
    progress = true

    const list = inputFile.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) {
        await createAttachment(file)
      }
    }
    inputFile.value = ''
    progress = false
  }

  let inputFile: HTMLInputElement

  async function remove (doc: Attachment): Promise<void> {
    if (canRemove) {
      await client.remove(doc)
    }
  }
</script>

<div class="container">
  <input
    bind:this={inputFile}
    multiple
    type="file"
    name="file"
    id="file"
    style="display: none"
    on:change={fileSelected}
  />
  <div class="flex flex-between flex-grow header clear-mins">
    <div class="fs-title">
      <Label label={attachment.string.Attachments} />
    </div>
    {#if canAdd}
      <div>
        {#if progress}
          <Loading />
        {:else}
          <ActionIcon size={'medium'} icon={IconAdd} action={add} />
        {/if}
      </div>
    {/if}
  </div>
  <div class="content">
    {#each docs as doc}
      <div class="item">
        <AttachmentPresenter value={doc} showPreview removable={canRemove} on:remove={() => remove(doc)} />
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .header {
    border-bottom: 1px solid var(--theme-divider-color);
    padding: 1rem 1.5rem;
    margin-right: -0.5rem;
    margin-left: -0.5rem;
    margin-bottom: 1rem;
  }

  .container {
    max-height: 30rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .content {
    overflow-y: scroll;
    flex: 1;
  }

  .item {
    margin: 0.5rem 1rem;
  }
</style>
