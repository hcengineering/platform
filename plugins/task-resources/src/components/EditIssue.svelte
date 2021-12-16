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
  import { getClient } from '@anticrm/presentation'
  import type { Issue } from '@anticrm/task'
  import { EditBox, Grid } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import task from '../plugin'

  export let object: Issue

  const dispatch = createEventDispatcher()
  const client = getClient()

  function change (field: string, value: any) {
    client.updateCollection(
      object._class,
      object.space,
      object._id,
      object.attachedTo,
      object.attachedToClass,
      object.collection,
      { [field]: value }
    )
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name', 'description', 'number'] })
  })
</script>

{#if object !== undefined}
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
{/if}
