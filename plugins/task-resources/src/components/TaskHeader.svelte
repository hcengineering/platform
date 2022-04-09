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
  import core, { Class, Doc, Ref, RefTo } from '@anticrm/core'
  import { AttributesBar, getClient, KeyedAttribute, UserBox } from '@anticrm/presentation'
  import { Task } from '@anticrm/task'
  import task from '../plugin'

  export let object: Task
  export let keys: KeyedAttribute[]
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

  $: filtredKeys = keys.filter((p) => p.key !== 'state' && p.key !== 'assignee' && p.key !== 'doneState') // todo
</script>

<div class="flex-between header">
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

<style lang="scss">
  .header {
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
