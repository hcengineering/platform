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
  import contact from '@anticrm/contact'
  import { Class, Ref } from '@anticrm/core'
  import { createQuery, getClient, UserBox } from '@anticrm/presentation'
  import { StyledTextBox } from '@anticrm/text-editor'
  import type { Issue, Team } from '@anticrm/tracker'
  import { AnyComponent, Button, EditBox, Grid, IconDown, IconUp } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'
  // import Card from '../Card.svelte'
  import { Panel } from '@anticrm/ui'
  import IssuePresenter from './IssuePresenter.svelte'

  export let _id: Ref<Issue>
  export let _class: Ref<Class<Issue>>
  export let rightSection: AnyComponent | undefined = undefined

  let object: Issue | undefined

  let currentTeam: Team | undefined

  const query = createQuery()
  $: _id &&
    _class &&
    query.query(_class, { _id }, async (result) => {
      object = result[0]
    })
  
  $: if (object !== undefined) {
    client.findOne(tracker.class.Team, { _id: object.space }).then((r) => {
      currentTeam = r
    })
  }
  const dispatch = createEventDispatcher()
  const client = getClient()

  function change (field: string, value: any) {
    if (object !== undefined) {
      client.update(object, { [field]: value })
    }
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name', 'description', 'number'] })
  })
</script>

{#if object !== undefined}
  <Panel
    reverseCommands={true}
    useOverlay={false}
    rightSection={rightSection !== undefined}
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="subtitle">
      {#if currentTeam}
        <IssuePresenter value={object} {currentTeam} />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="actions">
      <div class="tool flex gap-1">
        <Button icon={IconDown}/>
        <Button icon={IconUp}/>
      </div>
    </svelte:fragment>
    <div class="p-10">
      <Grid column={1} rowGap={1.5}>
        <EditBox
          label={tracker.string.Title}
          bind:value={object.title}
          placeholder={tracker.string.IssueTitlePlaceholder}
          maxWidth={'16rem'}
          focus
          on:change={() => change('title', object?.title)}
        />
        <StyledTextBox
          alwaysEdit
          bind:content={object.description}
          placeholder={tracker.string.IssueDescriptionPlaceholder}
          on:value={(evt) => change('description', evt.detail)}
        />
        <UserBox
          _class={contact.class.Employee}
          title={tracker.string.Assignee}
          caption={tracker.string.Assignee}
          bind:value={object.assignee}
          allowDeselect
          titleDeselect={tracker.string.TaskUnAssign}
          on:change={() => change('assignee', object?.assignee)}
        />
      </Grid>
    </div>
  </Panel>
{/if}
