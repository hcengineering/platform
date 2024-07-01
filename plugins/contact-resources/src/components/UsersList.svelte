<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import contact, { Channel, ChannelProvider, Contact, Employee, PersonAccount } from '@hcengineering/contact'
  import { Class, flipSet, getCurrentAccount, getObjectValue, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { CheckBox, createFocusManager, FocusHandler, ListView, RadioButton } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import UserDetails from './UserDetails.svelte'
  import { personByIdStore } from '../utils'

  export let _class: Ref<Class<Contact>> = contact.mixin.Employee
  export let searchField: string = 'name'
  export let searchMode: 'field' | 'fulltext' | 'disabled' = 'field'
  export let groupBy = '_class'
  export let search: string = ''
  export let selected: Ref<Contact>[] = []
  export let skipCurrentAccount = false
  export let disableDeselectFor: Ref<Contact>[] = []
  export let showStatus = true
  export let skipInactive = false
  export let multiselect = true
  export let channelProviders: ChannelProvider[] = []
  export let skipWithoutChannels = false

  const dispatch = createEventDispatcher()
  const query = createQuery()
  const focusManager = createFocusManager()
  const currentAccount = getCurrentAccount() as PersonAccount

  let listSelection = 0
  let list: ListView

  $: selectedItems = new Set<Ref<Contact>>(selected)

  let persons: Contact[] = []

  $: currentPerson = $personByIdStore.get(currentAccount.person)

  $: query.query(
    _class,
    {
      ...(searchMode !== 'disabled' && search !== ''
        ? searchMode === 'fulltext'
          ? { $search: search }
          : { [searchField]: { $like: '%' + search + '%' } }
        : {}),
      ...(skipCurrentAccount && currentPerson ? { _id: { $ne: currentPerson._id as Ref<Employee> } } : {}),
      ...(skipInactive && _class === contact.mixin.Employee ? { active: true } : {}),
      ...(skipWithoutChannels ? { channels: { $gte: 1 } } : {})
    },
    (result) => {
      result.sort((a, b) => {
        const aval: string = `${getObjectValue(groupBy, a as any)}`
        const bval: string = `${getObjectValue(groupBy, b as any)}`
        return aval.localeCompare(bval)
      })
      if (skipWithoutChannels && channelProviders.length > 0) {
        persons = result.filter((it) => {
          const channels = (it.$lookup?.channels ?? []) as Channel[]
          return channels.some((channel) => channelProviders.some((provider) => provider._id === channel.provider))
        })
      } else {
        persons = result
      }
    },
    {
      limit: 200,
      ...(channelProviders.length > 0
        ? {
            lookup: { _id: { channels: contact.class.Channel } }
          }
        : {})
    }
  )

  function handleSelection (contacts: Contact[], index: number) {
    const contact = contacts[index]

    if (contact === undefined) {
      return
    }

    if (multiselect) {
      selectedItems = flipSet(selectedItems, contact._id)
    } else {
      selectedItems = selectedItems.has(contact._id) ? new Set() : new Set([contact._id])
    }

    dispatch('select', Array.from(selectedItems))
  }

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(listSelection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(listSelection + 1)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      handleSelection(persons, listSelection)
    }
  }

  $: firstSelected = Array.from(selectedItems.values())[0]
</script>

<FocusHandler manager={focusManager} />

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="w-full" tabindex="0" on:keydown={onKeydown}>
  <ListView bind:this={list} count={persons.length} bind:selection={listSelection} colorsSchema="lumia" noScroll>
    <svelte:fragment slot="item" let:item={index}>
      {@const person = persons[index]}
      {@const disabled = selectedItems.has(person._id) && disableDeselectFor.includes(person._id)}
      <button
        class="row withList w-full"
        class:cursor-default={disabled}
        {disabled}
        on:click={() => {
          handleSelection(persons, index)
        }}
      >
        <UserDetails avatarSize="small" {person} {showStatus} {channelProviders} />
        {#if multiselect}
          <CheckBox
            checked={selectedItems.has(person._id)}
            readonly={disabled}
            kind="primary"
            on:value={() => {
              handleSelection(persons, index)
            }}
          />
        {:else}
          <RadioButton group={firstSelected} value={person._id} kind="primary" />
        {/if}
      </button>
    </svelte:fragment>
  </ListView>
</div>

<style lang="scss">
  .row {
    display: flex;
    align-items: center;
    padding: var(--spacing-1) var(--spacing-2) var(--spacing-1) var(--spacing-1);
    flex-grow: 1;
    border-radius: var(--small-BorderRadius);
    justify-content: space-between;
    margin-bottom: 0.125rem;
  }
</style>
