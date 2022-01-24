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
  import type { Ref, Space, Doc, Class, FindOptions } from '@anticrm/core'
  import type { Issue } from '@anticrm/task'
  import { createQuery } from '@anticrm/presentation'
  import { CircleButton, IconAdd, showPopup, Label } from '@anticrm/ui'
  import CreateTask from './CreateTask.svelte'
  // import FileDuo from "./icons/FileDuo.svelte"
  import { Table } from '@anticrm/view-resources'

  import core from '@anticrm/core'
  import task from '../plugin'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  let tasks: Issue[] = []

  const query = createQuery()
  $: query.query(task.class.Issue, { attachedTo: objectId }, result => { tasks = result })

  const createApp = (ev: MouseEvent): void => {
    showPopup(CreateTask, { parent: { _id: objectId, _class, space } }, ev.target as HTMLElement, () => {})
  }

  const options: FindOptions<Issue> = {
    lookup: {
      state: task.class.State,
      space: core.class.Space
    }
  }
</script>

<div class="applications-container">
  <div class="flex-row-center">
    <div class="title">Tasks</div>
    <CircleButton icon={IconAdd} size={'small'} on:click={createApp} />
  </div>
  {#if tasks.length > 0}
    <Table 
      _class={task.class.Issue}
      config={['', '$lookup.space.name', '$lookup.state']}
      {options}
      query={ { attachedTo: objectId } }
    />
  {:else}
    <div class="flex-col-center mt-5 createapp-container">
      <!-- <FileDuo size={'large'} /> -->
      <div class="small-text content-dark-color mt-2">
        <Label label={task.string.NoTaskForObject} />
      </div>
      <div class="small-text">
        <a href={'#'} on:click={createApp}><Label label={task.string.CreateTask} /></a>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .applications-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: .75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .createapp-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;
  }
</style>
