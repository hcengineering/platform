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
  import { Data, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Card, SpaceSelector, getClient } from '@hcengineering/presentation'
  import { StyledTextArea } from '@hcengineering/text-editor-resources'
  import { TestSuite, TestProject } from '@hcengineering/test-management'
  import { EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import testManagement from '../../plugin'
  import ProjectPresenter from '../project/ProjectSpacePresenter.svelte'

  export let space: Ref<TestProject>
  const dispatch = createEventDispatcher()
  const client = getClient()

  const object: Data<TestSuite> = {
    name: '' as IntlString,
    description: ''
  }

  let _space = space

  async function onSave () {
    await client.createDoc(testManagement.class.TestSuite, _space, object)
  }
</script>

<Card
  label={testManagement.string.CreateTestSuite}
  okAction={onSave}
  canSave={object.name !== ''}
  okLabel={testManagement.string.CreateTestSuite}
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
    placeholder={testManagement.string.NamePlaceholder}
    kind={'large-style'}
    autoFocus
  />
  <StyledTextArea
    bind:content={object.description}
    placeholder={testManagement.string.DescriptionPlaceholder}
    kind={'emphasized'}
    showButtons={false}
  />
</Card>
