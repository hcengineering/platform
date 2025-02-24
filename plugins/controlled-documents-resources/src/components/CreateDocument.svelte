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
  import { createEventDispatcher } from 'svelte'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { AttachedData, Class, generateId, Mixin, Ref, SortingOrder } from '@hcengineering/core'
  import { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { createFocusManager, EditBox, FocusHandler } from '@hcengineering/ui'
  import { ObjectBox } from '@hcengineering/view-resources'
  import {
    type ControlledDocument,
    type DocumentTemplate,
    type DocumentCategory,
    type ChangeControl,
    type DocumentSpace,
    DocumentState
  } from '@hcengineering/controlled-documents'

  import { createControlledDocFromTemplate } from '../docutils'
  import documents from '../plugin'

  export let documentClass: Ref<Class<ControlledDocument>> = documents.class.ControlledDocument
  export let templateMixin: Ref<Mixin<DocumentTemplate>> = documents.mixin.DocumentTemplate
  export let initTemplateId: Ref<DocumentTemplate> | undefined = undefined
  export let excludedTemplates: Array<Ref<DocumentTemplate>> | undefined = undefined
  export let isTemplateMandatory: boolean = false
  export let isTemplateReadonly: boolean = false
  export let space: Ref<DocumentSpace>

  export function canClose (): boolean {
    return object.title === ''
  }

  const id = generateId<ControlledDocument>()
  const currentUser = getCurrentEmployee()

  const object: AttachedData<ControlledDocument> = {
    template: '' as Ref<DocumentTemplate>,
    title: '',
    code: '',
    prefix: '',
    labels: 0,
    major: 0,
    minor: 1,
    commentSequence: 0,
    author: currentUser,
    owner: currentUser,
    seqNumber: 0,
    category: '' as Ref<DocumentCategory>,
    abstract: '',
    state: DocumentState.Draft,
    requests: 0,
    snapshots: 0,
    reviewers: [],
    approvers: [],
    coAuthors: [],
    changeControl: '' as Ref<ChangeControl>,
    content: null
  }

  let templateId: Ref<DocumentTemplate> | undefined = initTemplateId

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function handleOkAction (): Promise<void> {
    if (isTemplateMandatory && !templateId) {
      return
    }

    await createControlledDocFromTemplate(client, templateId, id, object, space, undefined, undefined, documentClass)

    dispatch('close', id)
  }

  const manager = createFocusManager()

  $: if (templateId === undefined) {
    void client
      .findOne(
        templateMixin,
        { _class: documentClass, _id: { $nin: excludedTemplates ?? [] } },
        { sort: { modifiedOn: SortingOrder.Descending } }
      )
      .then((tpl) => {
        if (tpl !== undefined) {
          templateId = tpl._id
        }
      })
  }

  const templateQuery = createQuery()
  let template: DocumentTemplate | undefined

  $: templateQuery.query(
    templateMixin,
    { _class: documentClass, _id: templateId },
    (res) => {
      if (res) {
        ;[template] = res
        object.template = template._id
        object.prefix = template.prefix
        object.category = template.category
        object.content = template.content
      }
    },
    {
      limit: 1
    }
  )
</script>

<FocusHandler {manager} />

<Card
  label={documents.string.CreateDocument}
  okAction={handleOkAction}
  canSave={object.title.length > 0 && (templateId !== undefined || !isTemplateMandatory)}
  on:close={() => {
    dispatch('close')
  }}
>
  <svelte:fragment slot="header">
    <ObjectBox
      _class={templateMixin}
      excluded={excludedTemplates}
      readonly={isTemplateReadonly}
      docQuery={{ _class: documentClass }}
      options={{ sort: { modifiedOn: SortingOrder.Descending } }}
      bind:value={templateId}
      kind={isTemplateReadonly ? 'ghost' : 'no-border'}
      size="small"
      label={documents.string.DocumentTemplate}
      icon={documents.icon.Document}
      searchField="title"
      allowDeselect={false}
      showNavigate={false}
      docProps={{ disableLink: true, showTitle: true }}
    />
  </svelte:fragment>
  <div class="fs-title flex-row-center clear-mins">
    <EditBox
      placeholder={documents.string.Title}
      bind:value={object.title}
      kind="large-style"
      autoFocus
      focusIndex={1}
    />
  </div>
</Card>
