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
  import core, { Class, Doc, Mixin, Ref, RefTo } from '@anticrm/core'
  import { AttributesBar, getClient, KeyedAttribute, UserBox } from '@anticrm/presentation'
  import { Label } from '@anticrm/ui'
  import { Task } from '@anticrm/task'
  import task from '../plugin'
  import { DocAttributeBar } from '@anticrm/view-resources'

  export let object: Task
  export let keys: KeyedAttribute[]
  export let mixins: Mixin<Doc>[]
  export let ignoreKeys: string[]
  export let vertical: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function change () {
    client.updateCollection(
      object._class,
      object.space,
      object._id,
      object.attachedTo,
      object.attachedToClass,
      object.collection,
      { assignee: object.assignee }
    )
  }

  $: assigneeTitle = hierarchy.getAttribute(object._class, 'assignee').label

  function getAssigneeClass (object: Task): Ref<Class<Doc>> {
    const attribute = hierarchy.getAttribute(object._class, 'assignee')
    const attrClass = attribute.type._class
    if (attrClass === core.class.RefTo) {
      return (attribute.type as RefTo<Doc>).to
    }
    return contact.class.Employee
  }

  const taskKeys = ['state', 'assignee', 'doneState']

  $: filtredKeys = keys.filter((p) => !taskKeys.includes(p.key)) // todo
</script>

{#if !vertical}
  <div class="task-attr-header">
    <div class="flex-center">
      <UserBox
        _class={getAssigneeClass(object)}
        label={assigneeTitle}
        placeholder={assigneeTitle}
        bind:value={object.assignee}
        on:change={change}
        allowDeselect
        titleDeselect={task.string.TaskUnAssign}
      />
      <div class="column">
        <AttributesBar {object} keys={filtredKeys} />
      </div>
    </div>
    <AttributesBar {object} keys={['doneState', 'state']} showHeader={false} />
  </div>
{:else}
  <div class="task-attr-prop mb-4">
    <span class="fs-bold"><Label label={task.string.TaskAssignee} /></span>
    <UserBox
      _class={getAssigneeClass(object)}
      label={assigneeTitle}
      placeholder={assigneeTitle}
      kind={'link'}
      size={'large'}
      bind:value={object.assignee}
      on:change={change}
      allowDeselect
      titleDeselect={task.string.TaskUnAssign}
    />
    <div style:grid-column={'1/3'}>
      <AttributesBar {object} keys={['doneState', 'state']} vertical />
    </div>
  </div>
  <DocAttributeBar {object} ignoreKeys={[...ignoreKeys, ...taskKeys]} {mixins} on:update />
{/if}

<style lang="scss">
  .task-attr-prop {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-template-rows: minmax(2rem, auto);
    grid-auto-flow: row;
    justify-content: start;
    align-items: center;
    gap: 1rem;
    width: 100%;
    height: min-content;
  }
  .task-attr-header {
    display: flex;
    justify-content: space-between;
    flex-wrap: nowrap;
    align-items: center;
    width: 100%;
    // padding: 0 0.5rem;

    .column {
      position: relative;
      margin-left: 3rem;
      &::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: -1.5rem;
        width: 1px;
        background-color: var(--theme-bg-accent-hover);
      }
    }
  }
</style>
