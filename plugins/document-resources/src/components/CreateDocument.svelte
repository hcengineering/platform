<!--
//
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
//
-->
<script lang="ts">
  import { EmployeeAccount } from '@hcengineering/contact'
  import { Data, generateId, getCurrentAccount, Ref } from '@hcengineering/core'
  import { CollaboratorDocument, Document, DocumentVersionState } from '@hcengineering/document'
  import { Card, getClient } from '@hcengineering/presentation'
  import { UserBoxList } from '@hcengineering/contact-resources'
  import { Button, createFocusManager, EditBox, FocusHandler } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import document from '../plugin'

  export function canClose (): boolean {
    return object.name === ''
  }

  const id = generateId()
  const currentUser = getCurrentAccount() as EmployeeAccount

  const object: Data<Document> = {
    name: '',
    versions: 0,
    attachments: 0,
    labels: 0,
    comments: 0,
    version: 0,
    latest: 0.1,
    approvers: [],
    authors: [currentUser.employee],
    reviewers: [],
    requests: 0
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createDocument () {
    const docId = await client.createDoc(document.class.Document, document.space.Documents, object, id)
    const contentAttachmentId: Ref<CollaboratorDocument> = generateId()
    const versionId = await client.addCollection(
      document.class.DocumentVersion,
      document.space.Documents,
      docId,
      document.class.Document,
      'versions',
      {
        content: '',
        description: '',
        impact: '',
        reason: '',
        state: DocumentVersionState.Draft,
        version: 0.1,
        attachments: 0,
        comments: 0,
        contentAttachmentId,
        initialContentId: '' as Ref<CollaboratorDocument>
      }
    )

    await client.addCollection(
      document.class.CollaboratorDocument,
      document.space.Documents,
      versionId,
      document.class.DocumentVersion,
      'attachments',
      {
        file: contentAttachmentId,
        name: 'content',
        size: 0,
        type: 'application/ydoc',
        description: '',
        pinned: false,
        lastModified: Date.now()
      },
      contentAttachmentId
    )

    dispatch('close', id)
  }

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<Card
  label={document.string.CreateDocument}
  okAction={createDocument}
  canSave={object.name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button icon={document.icon.Document} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <EditBox
      placeholder={document.string.DocumentNamePlaceholder}
      bind:value={object.name}
      kind={'large-style'}
      autoFocus
      focusIndex={1}
    />
  </div>
  <svelte:fragment slot="pool">
    <UserBoxList
      items={object.authors}
      label={document.string.Authors}
      emptyLabel={document.string.Authors}
      kind={'regular'}
      size={'large'}
      width={'min-content'}
      on:update={({ detail }) => (object.authors = detail)}
    />
    <UserBoxList
      items={object.approvers}
      label={document.string.Approvers}
      emptyLabel={document.string.Approvers}
      kind={'regular'}
      size={'large'}
      width={'min-content'}
      on:update={({ detail }) => (object.approvers = detail)}
    />
    <UserBoxList
      items={object.reviewers}
      label={document.string.Reviewers}
      emptyLabel={document.string.Reviewers}
      kind={'regular'}
      size={'large'}
      width={'min-content'}
      on:update={({ detail }) => (object.reviewers = detail)}
    />
  </svelte:fragment>
</Card>
