<!--
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
-->
<script lang="ts">
  import contact, { Employee } from '@anticrm/contact'
  import core, { Data, generateId, Ref, SortingOrder } from '@anticrm/core'
  import { OK, Status } from '@anticrm/platform'
  import { getClient, UserBox } from '@anticrm/presentation'
  import { Issue, IssuePriority, IssueStatus, Team } from '@anticrm/spuristo'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { EditBox, Grid, Status as StatusControl } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import spuristo from '../plugin'
  import { calcRank } from '../utils'
import Card from './Card.svelte';

  export let space: Ref<Team>
  export let parent: Ref<Issue> | undefined
  
  $: _space = space
  $: _parent = parent
  const status: Status = OK

  let assignee: Ref<Employee> | null = null

  const object: Data<Issue> = {
    title: '',
    description: '',
    assignee: null,
    number: 0,
    rank: '',
    status: IssueStatus.Backlog,
    priority: IssuePriority.NoPriority,
    dueDate: null,
    comments: 0
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const taskId: Ref<Issue> = generateId()

  export function canClose (): boolean {
    return object.title !== ''
  }

  async function createIssue () {
    const lastOne = await client.findOne<Issue>(
      spuristo.class.Issue,
      { status: object.status },
      { sort: { rank: SortingOrder.Descending } }
    )
    const incResult = await client.updateDoc(
      spuristo.class.Team,
      core.space.Space,
      _space,
      {
        $inc: { sequence: 1 }
      },
      true
    )

    const value: Data<Issue> = {
      title: object.title,
      description: object.description,
      assignee,
      number: (incResult as any).object.sequence,
      status: object.status,
      priority: object.priority,
      rank: calcRank(lastOne, undefined),
      parentIssue: _parent,
      comments: 0,
      dueDate: object.dueDate
    }

    await client.createDoc(spuristo.class.Issue, _space, value, taskId)
  }
</script>

<Card
  label={spuristo.string.NewIssue}
  okAction={createIssue}
  canSave={object.title.length > 0 && _space != null}
  spaceClass={spuristo.class.Team}
  spaceLabel={spuristo.string.Team}
  spacePlaceholder={spuristo.string.SelectTeam}
  bind:space={_space}
  on:close={() => {
    dispatch('close')
  }}
>
  <StatusControl slot="error" {status} />
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={spuristo.string.Title}
      bind:value={object.title}
      placeholder={spuristo.string.IssueTitlePlaceholder}
      maxWidth={'16rem'}
      focus
    />
    <StyledTextBox alwaysEdit bind:content={object.description} placeholder={spuristo.string.IssueDescriptionPlaceholder}/>
    <UserBox
      _class={contact.class.Employee}
      title={spuristo.string.Assignee}
      caption={spuristo.string.Assignee}
      bind:value={assignee}
      allowDeselect
      titleDeselect={spuristo.string.TaskUnAssign}
    />
  </Grid>
</Card>
