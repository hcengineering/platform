<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import contact, { Employee } from '@hcengineering/contact'
  import type { Class, Doc, DocumentQuery, IdMap, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { Label, showPopup, ActionIcon, IconClose, IconAdd, Icon } from '@hcengineering/ui'
  import type { IconSize } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'
  import { employeeByIdStore } from '../utils'
  import UserInfo from './UserInfo.svelte'
  import UsersPopup from './UsersPopup.svelte'
  import { getClient } from '@hcengineering/presentation'

  export let items: Ref<Employee>[] = []
  export let readonlyItems: Ref<Employee>[] = []
  export let _class: Ref<Class<Employee>> = contact.mixin.Employee
  export let docQuery: DocumentQuery<Employee> | undefined = {}

  export let label: IntlString | undefined = undefined
  export let actionLabel: IntlString = plugin.string.AddMember
  export let size: IconSize = 'x-small'
  export let width: string | undefined = undefined
  export let readonly: boolean = false

  let persons: Employee[] = getPersons(items, $employeeByIdStore)
  $: persons = getPersons(items, $employeeByIdStore)
  let readonlyPersons: Employee[] = getPersons(readonlyItems, $employeeByIdStore)
  $: readonlyPersons = getPersons(readonlyItems, $employeeByIdStore)

  const client = getClient()

  const dispatch = createEventDispatcher()

  async function addPerson (evt: Event): Promise<void> {
    showPopup(
      UsersPopup,
      {
        _class,
        label,
        docQuery,
        multiSelect: true,
        allowDeselect: false,
        selectedUsers: items,
        ignoreUsers: readonlyItems,
        readonly,
        filter: (it: Doc) => {
          if (client.getHierarchy().hasMixin(it, contact.mixin.Employee)) {
            return client.getHierarchy().as(it, contact.mixin.Employee).active
          }
          return true
        }
      },
      evt.target as HTMLElement,
      undefined,
      (result) => {
        if (result != null) {
          items = result
          dispatch('update', items)
        }
      }
    )
  }

  function getPersons (employees: Ref<Employee>[], employeeById: IdMap<Employee>) {
    return employees.map((p) => employeeById.get(p)).filter((p) => p !== undefined) as Employee[]
  }

  const removePerson = (removed: Employee) => {
    const newItems = items.filter((it) => it !== removed._id)
    dispatch('update', newItems)
  }
</script>

<div class="flex-col" style:width={width ?? 'auto'}>
  <div class="flex-row-center flex-wrap">
    {#each readonlyPersons as person}
      <div class="usertag-container gap-1-5">
        <UserInfo value={person} {size} />
      </div>
    {/each}
    {#each persons as person}
      <div class="usertag-container gap-1-5">
        <UserInfo value={person} {size} />
        <ActionIcon
          icon={IconClose}
          size={size === 'inline' ? 'x-small' : 'small'}
          action={() => removePerson(person)}
        />
      </div>
    {/each}
  </div>
  {#if !readonly}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="addButton {size === 'inline' ? 'small' : 'medium'} overflow-label gap-2 cursor-pointer"
      class:mt-2={persons.length > 0}
      on:click={addPerson}
    >
      <span><Label label={actionLabel} /></span>
      <Icon icon={IconAdd} size={size === 'inline' ? 'x-small' : 'small'} fill={'var(--theme-dark-color)'} />
    </div>
  {/if}
</div>

<style lang="scss">
  .usertag-container {
    display: flex;
    align-items: center;
    margin: 0 0.5rem 0.5rem 0;
    padding: 0.375rem 0.625rem 0.375rem 0.5rem;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
  }
  .addButton {
    display: flex;
    align-items: center;
    font-weight: 500;
    color: var(--theme-dark-color);

    &.small {
      height: 0.875rem;
      font-size: 0.75rem;
      line-height: 0.75rem;
    }
    &.medium {
      height: 1.125rem;
    }
  }
</style>
