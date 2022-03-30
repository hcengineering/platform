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
  import { getClient, UserBox } from '@anticrm/presentation'
  import type { Issue } from '@anticrm/tracker'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { EditBox, Grid } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'
  import Card from '../Card.svelte'

  export let object: Issue

  const dispatch = createEventDispatcher()
  const client = getClient()

  function change (field: string, value: any) {
    client.update(object, { [field]: value })
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name', 'description', 'number'] })
  })
</script>

<Card
  label={tracker.string.NewIssue}
  okAction={() => {}}
  canSave={true}
  on:close={() => {
    dispatch('close')
  }}
>
{#if object !== undefined}
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={tracker.string.Title}
      bind:value={object.title}
      placeholder={tracker.string.IssueTitlePlaceholder}
      maxWidth={'16rem'}
      focus
      on:change={() => change('title', object.title) }
    />
    <StyledTextBox alwaysEdit bind:content={object.description} placeholder={tracker.string.IssueDescriptionPlaceholder}
    on:change={() => change('description', object.description) }/>
    <UserBox
      _class={contact.class.Employee}
      title={tracker.string.Assignee}
      caption={tracker.string.Assignee}
      bind:value={object.assignee}
      allowDeselect
      titleDeselect={tracker.string.TaskUnAssign}
      on:change={() => change('assignee', object.assignee) }
    />
  </Grid>
{/if}
</Card>
<style lang="scss">
  .description {
    display: flex;
    padding: 1rem;
    height: 12rem;
    border-radius: .25rem;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
  }
</style>
