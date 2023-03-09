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
  import { getClient } from '@hcengineering/presentation'
  import type { Issue } from '@hcengineering/task'
  import task from '@hcengineering/task'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { EditBox, Grid } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import plugin from '../plugin'

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
  const onChangeDescription = (evt: CustomEvent<any>) => change('description', evt.detail)
</script>

{#if object !== undefined}
  <Grid column={1} rowGap={1.5}>
    <EditBox
      label={plugin.string.TaskName}
      bind:value={object.name}
      icon={task.icon.Task}
      placeholder={plugin.string.TaskNamePlaceholder}
      focus
      on:change={() => change('name', object.name)}
    />

    <div class="description">
      <StyledTextBox
        bind:content={object.description}
        placeholder={plugin.string.DescriptionPlaceholder}
        on:value={onChangeDescription}
      />
    </div>
  </Grid>
{/if}

<style lang="scss">
  .description {
    display: flex;
    padding: 1rem;
    height: 12rem;
    border-radius: 0.25rem;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
  }
</style>
