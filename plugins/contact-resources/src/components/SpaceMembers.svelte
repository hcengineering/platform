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
  import contact, { Employee, Person } from '@hcengineering/contact'
  import {
    AccountRole,
    DocumentQuery,
    Ref,
    SortingOrder,
    Space,
    getCurrentAccount,
    hasAccountRole,
    notEmpty,
    AccountUuid
  } from '@hcengineering/core'
  import { translateCB } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { ActionIcon, IconAdd, IconClose, Label, SearchEdit, showPopup, themeStore } from '@hcengineering/ui'
  import AddMembersPopup from './AddMembersPopup.svelte'
  import UserInfo from './UserInfo.svelte'
  import { personRefByAccountUuidStore, primarySocialIdByPersonRefStore } from '../utils'

  export let space: Space
  export let withAddButton: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const initialMembers = space.members.reduce<Record<Ref<Person>, AccountUuid>>((acc, m) => {
    const personRef = $personRefByAccountUuidStore.get(m)
    if (personRef === undefined) return acc
    acc[personRef] = m
    return acc
  }, {})
  $: label = hierarchy.getClass(space._class).label
  let spaceClass = ''
  $: translateCB(label, {}, $themeStore.language, (p) => (spaceClass = p.toLowerCase()))
  let search: string = ''
  $: isSearch = search.trim().length
  let members: Set<Ref<Person>> = new Set<Ref<Person>>()

  async function getUsers (accounts: AccountUuid[], search: string): Promise<Employee[]> {
    const employeeRefs = accounts.map((acc) => $personRefByAccountUuidStore.get(acc)).filter(notEmpty)
    const query: DocumentQuery<Employee> =
      isSearch > 0 ? { name: { $like: '%' + search + '%' } } : { _id: { $in: employeeRefs } }
    const employees = await client.findAll(contact.mixin.Employee, query, { sort: { name: SortingOrder.Descending } })
    members = new Set(employees.filter((p) => employeeRefs.includes(p._id)).map((p) => p._id))

    return employees
  }

  async function add (person: Ref<Person>): Promise<void> {
    const pid = initialMembers[person] ?? $primarySocialIdByPersonRefStore.get(person)
    if (pid === undefined) return

    await client.update(space, {
      $push: {
        members: pid
      }
    })
  }

  async function removeMember (person: Ref<Person>): Promise<void> {
    const pid = initialMembers[person] ?? $primarySocialIdByPersonRefStore.get(person)
    if (pid === undefined) return

    await client.update(space, { $pull: { members: pid } })
  }

  function openAddMembersPopup (): void {
    showPopup(AddMembersPopup, { value: space }, undefined, async (accounts: AccountUuid[]) => {
      if (accounts != null) {
        for (const account of accounts) {
          if (space.members.includes(account)) continue

          await client.update(space, { $push: { members: account } })
        }
      }
    })
  }

  const account = getCurrentAccount()
  $: canRemove =
    hasAccountRole(account, AccountRole.Maintainer) ||
    (space.createdBy !== undefined && account.socialIds.includes(space.createdBy))
</script>

<div class="flex-row-reverse mb-3 mt-3"><SearchEdit bind:value={search} /></div>
{#await getUsers(space.members, search) then users}
  {@const current = users.filter((p) => members.has(p._id))}
  {@const foreign = users.filter((p) => !members.has(p._id))}
  {#if isSearch && foreign.length === 0 && current.length === 0}
    <div class="fs-title flex-center mt-10">
      <Label label={presentation.string.NoMatchesFound} />
    </div>
  {:else}
    {#if isSearch}
      <div class="pr-8 pl-8"><Label label={presentation.string.InThis} params={{ space: spaceClass }} /></div>
      {#if current.length === 0}
        <div class="fs-title pl-8 mb-4 mt-4">
          <Label label={presentation.string.NoMatchesInThis} params={{ space: spaceClass }} />
        </div>
      {/if}
    {/if}
    {#if !isSearch && withAddButton}
      <div class="item fs-title">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="flex-row-center" on:click={openAddMembersPopup}>
          <div class="flex-center ml-1 mr-1"><IconAdd size={'large'} /></div>
          <div class="flex-col ml-2 min-w-0 content-color">
            <Label label={presentation.string.Add} />
          </div>
        </div>
      </div>
    {/if}
    {#each current as person}
      <div class="flex-between">
        <div class="item fs-title"><UserInfo size={'medium'} value={person} /></div>
        {#if canRemove}
          <ActionIcon
            icon={IconClose}
            size={'small'}
            action={() => {
              removeMember(person._id)
            }}
          />
        {/if}
      </div>
    {/each}
    {#if foreign.length}
      <div class="mt-4 notIn h-full">
        <div class="divider w-full mb-4" />
        <div class="pr-8 pl-8"><Label label={presentation.string.NotInThis} params={{ space: spaceClass }} /></div>
        {#each foreign as person}
          <div class="item flex-between">
            <div class="fs-title"><UserInfo size={'medium'} value={person} /></div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="over-underline" on:click={() => add(person._id)}>
              <Label label={presentation.string.Add} />
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
{/await}

<style lang="scss">
  .notIn {
    background-color: var(--theme-bg-accent-color);
  }

  .divider {
    background-color: var(--theme-divider-color);
    height: 1px;
  }

  .item {
    color: var(--theme-caption-color);
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;

    &:hover,
    &:focus {
      background-color: var(--theme-button-hovered);
    }
  }
</style>
