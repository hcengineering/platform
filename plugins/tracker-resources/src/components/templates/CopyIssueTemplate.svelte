<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Ref, generateId, getCurrentAccount } from '@hcengineering/core'
  import presentation, { Card, SpaceSelector, getClient } from '@hcengineering/presentation'
  import task from '@hcengineering/task'
  import { IssueTemplate, Project } from '@hcengineering/tracker'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import ProjectPresenter from '../projects/ProjectPresenter.svelte'
  import IssueTemplatePresenter from './IssueTemplatePresenter.svelte'
  import { makeIssueTemplateCopy } from './copy'

  export let value: IssueTemplate

  const dispatch = createEventDispatcher()
  const client = getClient()
  const me = getCurrentAccount()

  let space: Ref<Project> | undefined = undefined

  async function copy (): Promise<void> {
    if (space === undefined) return
    const project = await client.findOne(tracker.class.Project, { _id: space, members: me.uuid })
    if (project === undefined) return
    const taskTypes = await client.findAll(task.class.TaskType, { parent: project.type })
    const data = makeIssueTemplateCopy(
      value,
      project._id,
      taskTypes.map((it) => it._id),
      generateId
    )
    await client.createDoc(tracker.class.IssueTemplate, project._id, data)
  }
</script>

<Card
  label={tracker.string.CopyToProject}
  okAction={copy}
  canSave={space !== undefined}
  okLabel={presentation.string.Copy}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={tracker.class.Project}
      query={{ archived: false, members: me.uuid, _id: { $ne: value.space } }}
      label={tracker.string.Project}
      bind:space
      autoSelect={false}
      kind={'regular'}
      size={'large'}
      component={ProjectPresenter}
      defaultIcon={tracker.icon.Home}
    />
  </svelte:fragment>
  <IssueTemplatePresenter {value} disabled />
</Card>
