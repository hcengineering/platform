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
  import { Doc, DocumentQuery, FindOptions, getCurrentAccount, Ref } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import {
    createFocusManager,
    EditBox,
    FocusHandler,
    Icon,
    IconCheck,
    ListView,
    resizeObserver,
    AnySvelteComponent,
    Label,
    tooltip
  } from '@hcengineering/ui'
  import presentation, {
    AssigneeCategory,
    UserInfo,
    assigneeCategoryOrder,
    createQuery,
    getCategorytitle,
    getClient
  } from '..'
  import { createEventDispatcher } from 'svelte'

  export let options: FindOptions<Contact> | undefined = undefined
  export let selected: Ref<Person> | undefined
  export let docQuery: DocumentQuery<Contact> | undefined = undefined
  export let prevAssigned: Ref<Employee>[] | undefined = []
  export let projectLead: Ref<Employee> | undefined = undefined
  export let projectMembers: Ref<Employee>[] | undefined = []
  export let allowDeselect = true
  export let titleDeselect: IntlString | undefined
  export let placeholder: IntlString = presentation.string.Search
  export let ignoreUsers: Ref<Person>[] = []
  export let shadows: boolean = true
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let size: 'small' | 'medium' | 'large' = 'small'
  export let searchField: string = 'name'
  export let showCategories: boolean = true
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
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

  $: updateCategories(objects, currentEmployee, prevAssigned, projectLead, projectMembers)

  function updateCategories (
    objects: Contact[],
    currentEmployee: Ref<Person>,
    prevAssigned: Ref<Person>[] | undefined,
    projectLead: Ref<Person> | undefined,
    projectMembers: Ref<Person>[] | undefined
  ) {
    const persons = new Map<Ref<Person>, AssigneeCategory>(objects.map((t) => [t._id, 'Other']))
    if (projectLead) {
      persons.set(projectLead, 'ProjectLead')
    }
    projectMembers?.forEach((p) => persons.set(p, 'ProjectMembers'))
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

  let selectedDiv: HTMLElement | undefined
  let scrollDiv: HTMLElement | undefined
  let cHeight = 0

  const updateLocation = (scrollDiv?: HTMLElement, selectedDiv?: HTMLElement, objects?: Doc[], selected?: Ref<Doc>) => {
    const objIt = objects?.find((it) => it._id === selected)
    if (objIt === undefined) {
      cHeight = 0
      return
    }
    if (scrollDiv && selectedDiv) {
      const r = selectedDiv.getBoundingClientRect()
      const r2 = scrollDiv.getBoundingClientRect()

      if (r && r2) {
        if (r.top > r2.top && r.bottom < r2.bottom) {
          cHeight = 0
        } else {
          if (r.bottom < r2.bottom) {
            cHeight = 1
          } else {
            cHeight = -1
          }
        }
      }
    }
  }

  $: updateLocation(scrollDiv, selectedDiv, contacts, selected)
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
  <div class="header flex-between">
    <EditBox kind={'search-style'} focusIndex={1} focus bind:value={search} {placeholder} />
  </div>
  {#if cHeight === 1}
    <div class="background-theme-content-accent" style:height={'1px'} />
  {/if}
  <div
    class="scroll"
    on:scroll={() => updateLocation(scrollDiv, selectedDiv, contacts, selected)}
    bind:this={scrollDiv}
  >
    <div class="box">
      <ListView bind:this={list} count={contacts.length} bind:selection>
        <svelte:fragment slot="category" let:item>
          {#if showCategories}
            {@const obj = toAny(contacts[item])}
            {@const category = categorizedPersons.get(obj._id)}
            {@const cl = hierarchy.getClass(contacts[item]._class)}
            {#if item === 0 || (item > 0 && categorizedPersons.get(toAny(contacts[item - 1])._id) !== categorizedPersons.get(obj._id))}
              <!--Category for first item-->
              <div class="category-box">
                <div class="flex flex-grow overflow-label">
                  <span class="fs-medium flex-center mt-2 mb-2 ml-2">
                    {#if cl.icon}
                      <Icon icon={cl.icon} size={'small'} />
                    {/if}
                    <div class="ml-1">
                      <Label label={getCategorytitle(category)} />
                    </div>
                  </span>
                </div>
              </div>
            {/if}
          {/if}
        </svelte:fragment>
        <svelte:fragment slot="item" let:item>
          {@const obj = contacts[item]}
          <button
            class="menu-item w-full"
            class:background-bg-focused={obj._id === selected}
            class:border-radius-1={obj._id === selected}
            on:click={() => {
              handleSelection(undefined, item)
            }}
          >
            {#if allowDeselect && selected}
              <div class="icon">
                {#if obj._id === selected}
                  <div bind:this={selectedDiv}>
                    {#if titleDeselect}
                      <div class="clear-mins" use:tooltip={{ label: titleDeselect }}>
                        <Icon icon={IconCheck} {size} />
                      </div>
                    {:else}
                      <Icon icon={IconCheck} {size} />
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}

            <span class="label">
              {#if obj._id === selected}
                <div bind:this={selectedDiv}>
                  <div class="flex flex-grow overflow-label">
                    <UserInfo size={'x-small'} value={obj} {icon} />
                  </div>
                </div>
              {:else}
                <div class="flex flex-grow overflow-label">
                  <UserInfo size={'x-small'} value={obj} {icon} />
                </div>
              {/if}
            </span>
          </button>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  {#if cHeight === -1}
    <div class="background-theme-content-accent" style:height={'3px'} />
  {/if}
</div>

<style lang="scss">
  .plainContainer {
    color: var(--caption-color);
    background-color: var(--body-color);
    border: 1px solid var(--button-border-color);
    border-radius: 0.25rem;
    box-shadow: none;
  }
</style>
