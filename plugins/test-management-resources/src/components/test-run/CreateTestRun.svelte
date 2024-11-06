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
  import { createEventDispatcher } from 'svelte'

  import { Attachment } from '@hcengineering/attachment'
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { ObjectBox } from '@hcengineering/view-resources'
  import core, { Data, Ref, generateId, makeCollaborativeDoc } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Card, SpaceSelector, getClient } from '@hcengineering/presentation'
  import { TestRun, TestProject } from '@hcengineering/test-management'
  import { EditBox } from '@hcengineering/ui'
  import { EmptyMarkup } from '@hcengineering/text'


  import testManagement from '../../plugin'
  import ProjectPresenter from '../project/ProjectSpacePresenter.svelte'

  export let space: Ref<TestProject>
  const dispatch = createEventDispatcher()
  const client = getClient()

  const id: Ref<TestRun> = generateId()

  const object: Data<TestRun> = {
    name: '' as IntlString,
    description: makeCollaborativeDoc(id, 'description'),
  }

  let _space = space

  let description = EmptyMarkup

  let descriptionBox: AttachmentStyledBox
  let attachments: Map<Ref<Attachment>, Attachment> = new Map<Ref<Attachment>, Attachment>()

  async function onSave () {
    await client.createDoc(testManagement.class.TestRun, _space, object)
  }
</script>

<Card
  label={testManagement.string.CreateTestRun}
  okAction={onSave}
  canSave={object.name !== ''}
  okLabel={testManagement.string.CreateTestRun}
  gap={'gapV-4'}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={testManagement.class.TestProject}
      label={testManagement.string.TestProject}
      bind:space={_space}
      kind={'regular'}
      size={'large'}
      component={ProjectPresenter}
      defaultIcon={testManagement.icon.Home}
    />
  </svelte:fragment>
  <EditBox
    bind:value={object.name}
    placeholder={testManagement.string.TestRunNamePlaceholder}
    kind={'large-style'}
    autoFocus
  />
  <AttachmentStyledBox
    bind:this={descriptionBox}
    objectId={id}
    _class={testManagement.class.TestRun}
    space={_space}
    alwaysEdit
    showButtons={false}
    bind:content={description}
    placeholder={core.string.Description}
    kind="indented"
    isScrollable={false}
    enableBackReferences={true}
    enableAttachments={false}
    on:attachments={(ev) => {
      if (ev.detail.size > 0) attachments = ev.detail.values
      else if (ev.detail.size === 0 && ev.detail.values != null) {
        attachments.clear()
        attachments = attachments
      }
    }}
  />
  <svelte:fragment slot="pool">
    <ObjectBox
      _class={testManagement.class.TestSuite}
      value={null}
      docQuery={{
        space: _space
      }}
      kind={'regular'}
      size={'small'}
      label={testManagement.string.SelectTestSuites}
      icon={testManagement.icon.TestSuite}
      searchField={'title'}
      allowDeselect={true}
      showNavigate={false}
      docProps={{ disabled: true, noUnderline: true }}
      focusIndex={20000}
    />
    <ObjectBox
      _class={testManagement.class.TestCase}
      value={null}
      docQuery={{
        space: _space
      }}
      kind={'regular'}
      size={'small'}
      label={testManagement.string.SelectTestCases}
      icon={testManagement.icon.TestCase}
      searchField={'title'}
      allowDeselect={true}
      showNavigate={false}
      docProps={{ disabled: true, noUnderline: true }}
      focusIndex={20000}
    />
  </svelte:fragment>
</Card>
