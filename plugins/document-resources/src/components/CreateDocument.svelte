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
  import { Data, generateId, getCurrentAccount } from '@hcengineering/core'
  import { Document } from '@hcengineering/document'
  import { Card, getClient } from '@hcengineering/presentation'
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
    content: 0,
    editSequence: 0,
    versions: 0,
    attachments: 0,
    labels: 0,
    comments: 0,
    versionCounter: 0,
    responsible: [currentUser.employee]
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createDocument () {
    await client.createDoc(document.class.Document, document.space.Documents, object, id)
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
>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button icon={document.icon.Document} size={'medium'} kind={'link-bordered'} disabled />
    </div>
    <EditBox
      placeholder={document.string.DocumentNamePlaceholder}
      bind:value={object.name}
      kind={'large-style'}
      focus
      focusIndex={1}
    />
  </div>
</Card>
