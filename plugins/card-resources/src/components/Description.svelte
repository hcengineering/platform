<!--
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
-->
<script lang="ts">
  import attachment from '@hcengineering/attachment'
  import { Card } from '@hcengineering/card'
  import { Blob, Ref } from '@hcengineering/core'
  import { getResource, setPlatformStatus, unknownError } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Heading } from '@hcengineering/text-editor'
  import { TableOfContents } from '@hcengineering/text-editor-resources'
  import { navigate } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { getObjectLinkFragment } from '@hcengineering/view-resources'
  import ContentEditor from './ContentEditor.svelte'

  export let doc: Card
  export let readonly: boolean = false
  export let content: HTMLElement
  export let minHeight: '15vh' | '25vh' = '25vh'

  const client = getClient()

  let editor: ContentEditor

  async function createEmbedding (file: File): Promise<{ file: Ref<Blob>, type: string } | undefined> {
    if (doc === undefined) {
      return undefined
    }

    try {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      const uuid = await uploadFile(file)
      // const attachmentId: Ref<Attachment> = generateId()

      // await client.addCollection(
      //   attachment.class.Embedding,
      //   doc.space,
      //   doc._id,
      //   doc._class,
      //   'embeddings',
      //   {
      //     file: uuid,
      //     name: file.name,
      //     type: file.type,
      //     size: file.size,
      //     lastModified: file.lastModified
      //   },
      //   attachmentId
      // )

      return { file: uuid, type: file.type }
    } catch (err: any) {
      await setPlatformStatus(unknownError(err))
    }
  }

  let headings: Heading[] = []
</script>

<div class="content select-text mt-4">
  <div class="toc-container">
    <div class="toc">
      <TableOfContents
        items={headings}
        on:select={(evt) => {
          const heading = evt.detail
          const element = window.document.getElementById(heading.id)
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />
    </div>
  </div>

  {#key doc._id}
    <ContentEditor
      focusIndex={30}
      object={doc}
      {readonly}
      boundary={content}
      overflow={'none'}
      editorAttributes={{ style: `padding: 0 2em 2em; margin: 0 -2em; min-height: ${minHeight}` }}
      attachFile={async (file) => {
        return await createEmbedding(file)
      }}
      on:headings={(evt) => {
        headings = evt.detail
      }}
      on:open-document={async (event) => {
        const doc = await client.findOne(event.detail._class, { _id: event.detail._id })
        if (doc != null) {
          const location = await getObjectLinkFragment(client.getHierarchy(), doc, {}, view.component.EditDoc)
          navigate(location)
        }
      }}
      bind:this={editor}
    />
  {/key}
</div>

<style lang="scss">
  .toc-container {
    position: absolute;
    pointer-events: none;
    inset: 0;
    z-index: 1;
  }

  .toc {
    width: 1rem;
    pointer-events: all;
    margin-left: -3rem;
    position: sticky;
    top: 0;
  }

  .content {
    position: relative;
    color: var(--content-color);
    line-height: 150%;
  }
</style>
