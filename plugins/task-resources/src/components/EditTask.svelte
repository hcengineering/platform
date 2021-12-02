<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Ref } from '@anticrm/core'
  import { Panel } from '@anticrm/panel'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { Task } from '@anticrm/task'
  import { EditBox, Grid } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'
  import Attachments from './Attachments.svelte'
  import TaskHeader from './TaskHeader.svelte'

  export let _id: Ref<Task>
  let object: Task

  const query = createQuery()
  $: query.query(task.class.Task, { _id }, (result) => {
    object = result[0]
  })

  const dispatch = createEventDispatcher()
  const client = getClient()

  function change (field: string, value: any) {
    client.updateDoc(task.class.Task, object.space, object._id, { [field]: value })
  }
</script>

{#if object !== undefined}
  <Panel
    icon={view.icon.Table}
    title={object.name}
    {object}
    on:close={() => {
      dispatch('close')
    }}
  >
    <TaskHeader {object} slot="subtitle" />

    <Grid column={1} rowGap={1.5}>
      <EditBox
        label={task.string.TaskName}
        bind:value={object.name}
        icon={task.icon.Task}
        placeholder="The boring task"
        maxWidth="39rem"
        focus
        on:change={(evt) => change('name', object.name)}
      />
      <EditBox
        label={task.string.TaskDescription}
        bind:value={object.description}
        icon={task.icon.Task}
        placeholder="Description"
        maxWidth="39rem"
        on:change={(evt) => change('description', object.description)}
      />
    </Grid>

    <div class="mt-14">
      <Attachments objectId={object._id} _class={object._class} space={object.space} />
    </div>
  </Panel>
{/if}

<style lang="scss">
  .attachments {
    margin-top: 3.5rem;
  }

  .grid-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 1.5rem;
  }
</style>
