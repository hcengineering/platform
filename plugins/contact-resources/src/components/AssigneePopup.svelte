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
  import contact, { Contact, Employee, EmployeeAccount, Person } from '@hcengineering/contact'
  import { DocumentQuery, FindOptions, getCurrentAccount, Ref } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import {
    createFocusManager,
    EditWithIcon,
    FocusHandler,
    Icon,
    IconCheck,
    IconSearch,
    deviceOptionsStore,
    ListView,
    resizeObserver,
    AnySvelteComponent,
    Label,
    tooltip
  } from '@hcengineering/ui'
  import presentation, { createQuery } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'
  import { AssigneeCategory, assigneeCategoryOrder, getCategoryTitle } from '../assignee'
  import UserInfo from './UserInfo.svelte'

  export let options: FindOptions<Contact> | undefined = undefined
  export let selected: Ref<Person> | undefined
  export let docQuery: DocumentQuery<Contact> | undefined = undefined
  export let prevAssigned: Ref<Employee>[] | undefined = []
  export let componentLead: Ref<Employee> | undefined = undefined
  export let members: Ref<Employee>[] | undefined = []
  export let allowDeselect = true
  export let titleDeselect: IntlString | undefined
  export let placeholder: IntlString = presentation.string.Search
  export let placeholderParam: any | undefined = undefined
  export let ignoreUsers: Ref<Person>[] = []
  export let shadows: boolean = true
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let searchField: string = 'name'
  export let showCategories: boolean = true
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  // const client = getClient()
  // const hierarchy = client.getHierarchy()
  const currentEmployee = (getCurrentAccount() as EmployeeAccount).employee

  let search: string = ''
  let objects: Contact[] = []
  let contacts: Contact[] = []

  let categorizedPersons: Map<Ref<Person>, AssigneeCategory>

  const dispatch = createEventDispatcher()
  const query = createQuery()

  $: query.query<Contact>(
    contact.class.Employee,
    {
      ...(docQuery ?? {}),
      [searchField]: { $like: '%' + search + '%' },
      _id: {
        ...(typeof docQuery?._id === 'object' ? docQuery._id : {}),
        $nin: ignoreUsers
      }
    },
    (result) => {
      objects = result
    },
    { ...(options ?? {}), limit: 200, sort: { name: 1 } }
  )

  $: updateCategories(objects, currentEmployee, prevAssigned, componentLead, members)

  function updateCategories (
    objects: Contact[],
    currentEmployee: Ref<Person>,
    prevAssigned: Ref<Person>[] | undefined,
    componentLead: Ref<Person> | undefined,
    members: Ref<Person>[] | undefined
  ) {
    const persons = new Map<Ref<Person>, AssigneeCategory>(objects.map((t) => [t._id, 'Other']))
    if (componentLead) {
      persons.set(componentLead, 'ComponentLead')
    }
    members?.forEach((p) => persons.set(p, 'Members'))
    prevAssigned?.forEach((p) => persons.set(p, 'PreviouslyAssigned'))
    if (selected) {
      persons.set(selected, 'Assigned')
    }
    persons.set(currentEmployee, 'CurrentUser')

    categorizedPersons = new Map<Ref<Person>, AssigneeCategory>(
      [...persons].sort((a, b) => assigneeCategoryOrder.indexOf(a[1]) - assigneeCategoryOrder.indexOf(b[1]))
    )
    contacts = []
    categorizedPersons.forEach((p, k) => {
      const c = objects.find((e) => e._id === k)
      if (c) {
        contacts.push(c)
      }
    })
  }

  let selection = 0
  let list: ListView

  async function handleSelection (evt: Event | undefined, selection: number): Promise<void> {
    const person = contacts[selection]
    selected = allowDeselect && person._id === selected ? undefined : person._id
    dispatch('close', selected !== undefined ? person : undefined)
  }

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      handleSelection(key, selection)
    }
  }
  const manager = createFocusManager()

  function toAny (obj: any): any {
    return obj
  }
</script>

<FocusHandler {manager} />

<div
  class="selectPopup"
  class:full-width={width === 'full'}
  class:plainContainer={!shadows}
  class:width-40={width === 'large'}
  on:keydown={onKeydown}
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  <div class="header">
    <EditWithIcon
      icon={IconSearch}
      size={'large'}
      width={'100%'}
      autoFocus={!$deviceOptionsStore.isMobile}
      bind:value={search}
      {placeholder}
      {placeholderParam}
      on:change
    />
  </div>
  <div class="scroll">
    <div class="box">
      <ListView bind:this={list} count={contacts.length} bind:selection>
        <svelte:fragment slot="category" let:item>
          {#if showCategories}
            {@const obj = toAny(contacts[item])}
            {@const category = categorizedPersons.get(obj._id)}
            <!-- {@const cl = hierarchy.getClass(contacts[item]._class)} -->
            {#if item === 0 || (item > 0 && categorizedPersons.get(toAny(contacts[item - 1])._id) !== categorizedPersons.get(obj._id))}
              <!--Category for first item-->
              {#if item > 0}<div class="menu-separator" />{/if}
              <div class="menu-group__header flex-row-center category-box">
                <!-- {#if cl.icon}
                  <div class="clear-mins mr-2"><Icon icon={cl.icon} size={'small'} /></div>
                {/if} -->
                <span class="overflow-label">
                  <Label label={getCategoryTitle(category)} />
                </span>
              </div>
            {/if}
          {/if}
        </svelte:fragment>
        <svelte:fragment slot="item" let:item>
          {@const obj = contacts[item]}
          <button
            class="menu-item withList no-focus w-full"
            class:selected={obj._id === selected}
            on:click={() => {
              handleSelection(undefined, item)
            }}
          >
            <div class="flex-grow clear-mins">
              <UserInfo size={'smaller'} value={obj} {icon} />
            </div>
            {#if allowDeselect && selected}
              <div class="check">
                {#if obj._id === selected}
                  <div use:tooltip={{ label: titleDeselect ?? presentation.string.Deselect }}>
                    <Icon icon={IconCheck} size={'small'} />
                  </div>
                {/if}
              </div>
            {/if}
          </button>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  <div class="menu-space" />
</div>

<style lang="scss">
  .plainContainer {
    color: var(--caption-color);
    background-color: var(--theme-bg-color);
    border: 1px solid var(--button-border-color);
    border-radius: 0.25rem;
    box-shadow: none;
  }
</style>
