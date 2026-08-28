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
  import { Contact, getCurrentEmployee, Person } from '@hcengineering/contact'
  import { DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import presentation, { createQuery } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    EditWithIcon,
    FocusHandler,
    Icon,
    IconCheck,
    IconSearch,
    Label,
    ListView,
    Spinner,
    createFocusManager,
    deviceOptionsStore,
    resizeObserver,
    tooltip
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { AssigneeCategory } from '../assignee'
  import contact from '../plugin'
  import UserInfo from './UserInfo.svelte'

  export let options: FindOptions<Contact> | undefined = undefined
  export let selected: Ref<Person> | undefined | null
  export let docQuery: DocumentQuery<Contact> | undefined = undefined
  export let categories: AssigneeCategory[] | undefined = undefined
  export let allowDeselect = true
  export let titleDeselect: IntlString | undefined
  export let placeholder: IntlString = presentation.string.Search
  export let placeholderParam: any | undefined = undefined
  export let ignoreUsers: Ref<Person>[] = []
  export let shadows: boolean = true
  export let width: 'medium' | 'large' | 'full' = 'medium'
  export let searchField: string = 'name'
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let loading = false

  $: showCategories = categories !== undefined && categories.length > 0

  let search: string = ''
  let objects: Contact[] = []
  let contacts: Contact[] = []

  const categorizedPersons = new Map<Ref<Person>, AssigneeCategory>()

  const dispatch = createEventDispatcher()
  const query = createQuery()

  $: query.query<Contact>(
    contact.mixin.Employee,
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

  let dataLoading = false

  $: {
    dataLoading = true
    updateCategories(objects, categories).then(() => {
      dataLoading = false
    })
  }

  const currentUserCategory: AssigneeCategory = {
    label: contact.string.CategoryCurrentUser,
    func: async () => {
      const employee = getCurrentEmployee()
      return [employee]
    }
  }

  const assigned: AssigneeCategory = {
    label: contact.string.Assigned,
    func: async () => {
      return selected ? [selected] : []
    }
  }

  const otherCategory: AssigneeCategory = {
    label: contact.string.CategoryOther,
    func: async (val: Ref<Contact>[]) => {
      return val
    }
  }

  async function updateCategories (objects: Contact[], categories: AssigneeCategory[] | undefined) {
    const refs = objects.map((e) => e._id)

    for (const category of [currentUserCategory, assigned, ...(categories ?? []), otherCategory]) {
      const res = await category.func(refs)
      for (const contact of res) {
        if (categorizedPersons.has(contact)) continue
        categorizedPersons.set(contact, category)
      }
    }
    contacts = []
    categorizedPersons.forEach((p, k) => {
      const c = objects.find((e) => e._id === k)
      if (c) {
        contacts.push(c)
      }
      contacts = contacts
    })
  }

  let selection = 0
  let list: ListView

  $: deselectItemCount = allowDeselect ? 1 : 0
  $: listCount = contacts.length + deselectItemCount

  function isDeselectItem (item: number): boolean {
    return allowDeselect && item === 0
  }

  function getContactByItem (item: number): Contact | undefined {
    return contacts[item - deselectItemCount]
  }

  function shouldShowCategory (item: number, obj: Contact): boolean {
    if (!showCategories) return false

    const category = categorizedPersons.get(obj._id)
    if (category === undefined) return false

    const contactIndex = item - deselectItemCount
    if (contactIndex === 0) return true

    const prev = contacts[contactIndex - 1]
    return prev !== undefined && categorizedPersons.get(prev._id) !== category
  }

  async function handleSelection (evt: Event | undefined, selection: number): Promise<void> {
    if (isDeselectItem(selection)) {
      selected = undefined
      dispatch('close', null)
      return
    }

    const person = getContactByItem(selection)
    if (person === undefined) {
      dispatch('close', undefined)
      return
    }

    if (allowDeselect && person._id === selected) {
      selected = undefined
      dispatch('close', null)
      return
    }

    selected = person._id
    dispatch('close', person)
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

</script>

<FocusHandler {manager} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
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
      loading={dataLoading}
      on:change
    />
  </div>
  <div class="scroll">
    <div class="box">
      <ListView bind:this={list} count={listCount} bind:selection>
        <svelte:fragment slot="category" let:item>
          {#if showCategories && !isDeselectItem(item)}
            {@const obj = getContactByItem(item)}
            {#if obj !== undefined}
              {@const category = categorizedPersons.get(obj._id)}
              <!-- {@const cl = hierarchy.getClass(contacts[item]._class)} -->
              {#if category !== undefined && shouldShowCategory(item, obj)}
                <!--Category for first item-->
                {#if item > 0}<div class="menu-separator" />{/if}
                <div class="menu-group__header flex-row-center category-box">
                  <span class="overflow-label">
                    <Label label={category.label} />
                  </span>
                </div>
              {/if}
            {/if}
          {/if}
        </svelte:fragment>
        <svelte:fragment slot="item" let:item>
          {#if isDeselectItem(item)}
            <button
              class="menu-item withList no-focus w-full"
              class:selected={selected == null}
              disabled={loading}
              on:click={() => {
                handleSelection(undefined, item)
              }}
            >
              <div class="flex-grow clear-mins">
                <div class="flex-row-center">
                  <div class="no-assignee-avatar" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M10 10.25C11.7949 10.25 13.25 8.79493 13.25 7C13.25 5.20507 11.7949 3.75 10 3.75C8.20507 3.75 6.75 5.20507 6.75 7C6.75 8.79493 8.20507 10.25 10 10.25Z"
                        stroke="currentColor"
                        stroke-width="1.35"
                      />
                      <path
                        d="M4.75 16.25C5.375 13.9 7.375 12.75 10 12.75C12.625 12.75 14.625 13.9 15.25 16.25"
                        stroke="currentColor"
                        stroke-width="1.35"
                        stroke-linecap="round"
                      />
                      <path d="M4.5 4.5L15.5 15.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" />
                    </svg>
                  </div>
                  <div class="flex-col min-w-0 ml-2">
                    <div class="label text-left overflow-label">
                      <Label label={titleDeselect ?? contact.string.Unassigned} />
                    </div>
                  </div>
                </div>
              </div>
              {#if loading && selected == null}
                <Spinner size={'small'} />
              {:else}
                <div class="check">
                  {#if selected == null}
                    <Icon icon={IconCheck} size={'small'} />
                  {/if}
                </div>
              {/if}
            </button>
          {:else}
            {@const obj = getContactByItem(item)}
            {#if obj !== undefined}
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
                  {#if loading && obj._id === selected}
                    <Spinner size={'small'} />
                  {:else}
                    <div class="check">
                      {#if obj._id === selected}
                        <div use:tooltip={{ label: titleDeselect ?? presentation.string.Deselect }}>
                          <Icon icon={IconCheck} size={'small'} />
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/if}
              </button>
            {/if}
          {/if}
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

  .no-assignee-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    flex: 0 0 1.75rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-hovered);
    border: 1px solid var(--button-border-color);
    border-radius: 0.375rem;
  }

  .no-assignee-avatar svg {
    width: 1.125rem;
    height: 1.125rem;
  }
</style>
