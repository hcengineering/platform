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
  import {
    Class,
    DocumentQuery,
    FindOptions,
    getCurrentAccount,
    Ref,
    SortingOrder,
    SortingQuery,
    Space
  } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Button,
    getCurrentResolvedLocation,
    Icon,
    Label,
    navigate,
    Scroller,
    SearchEdit,
    showPopup
  } from '@hcengineering/ui'
  import { FilterBar, FilterButton, SpacePresenter } from '@hcengineering/view-resources'
  import plugin from '../plugin'
  import { classIcon } from '../utils'

  export let _class: Ref<Class<Space>>
  export let label: IntlString
  export let createItemDialog: AnyComponent | undefined = undefined
  export let createItemLabel: IntlString = presentation.string.Create
  export let withHeader: boolean = true
  export let withFilterButton: boolean = true
  export let search: string = ''

  const me = getCurrentAccount()._id
  const client = getClient()
  const spaceQuery = createQuery()
  const sort: SortingQuery<Space> = {
    name: SortingOrder.Ascending
  }
  let searchQuery: DocumentQuery<Space>
  let resultQuery: DocumentQuery<Space>

  let spaces: Space[] = []

  $: updateSearchQuery(search)
  $: update(sort, resultQuery)

  async function update (sort: SortingQuery<Space>, resultQuery: DocumentQuery<Space>): Promise<void> {
    const options: FindOptions<Space> = {
      sort
    }

    spaceQuery.query(
      _class,
      {
        ...resultQuery
      },
      (res) => {
        spaces = res
      },
      options
    )
  }

  function updateSearchQuery (search: string): void {
    searchQuery = search.length ? { $search: search } : {}
  }

  function showCreateDialog (ev: Event) {
    showPopup(createItemDialog as AnyComponent, {}, 'middle')
  }

  async function join (space: Space): Promise<void> {
    if (space.members.includes(me)) return
    await client.update(space, {
      $push: {
        members: me
      }
    })
  }

  async function leave (space: Space): Promise<void> {
    if (!space.members.includes(me)) return
    await client.update(space, {
      $pull: {
        members: me
      }
    })
  }

  async function view (space: Space): Promise<void> {
    const loc = getCurrentResolvedLocation()
    loc.path[3] = space._id
    navigate(loc)
  }
</script>

{#if withHeader}
  <div class="ac-header full divide">
    <div class="ac-header__wrap-title">
      <span class="ac-header__title"><Label {label} /></span>
    </div>
    {#if createItemDialog}
      <div class="mb-1 clear-mins">
        <Button label={createItemLabel} kind={'accented'} size={'medium'} on:click={(ev) => showCreateDialog(ev)} />
      </div>
    {/if}
  </div>
  <div class="ac-header full divide search-start">
    <div class="ac-header-full small-gap">
      <SearchEdit
        bind:value={search}
        on:change={() => {
          updateSearchQuery(search)
          update(sort, resultQuery)
        }}
      />
      <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
      <div class="buttons-divider" />
      {#if withFilterButton}
        <FilterButton {_class} />
      {/if}
    </div>
  </div>
{:else if withFilterButton}
  <div class="ac-header full divide">
    <div class="ac-header-full small-gap">
      <FilterButton {_class} />
    </div>
  </div>
{/if}
<FilterBar {_class} query={searchQuery} space={undefined} on:change={(e) => (resultQuery = e.detail)} />
<Scroller padding={'2.5rem'}>
  <div class="spaces-container">
    {#each spaces as space (space._id)}
      {@const icon = classIcon(client, space._class)}
      {@const joined = space.members.includes(me)}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <div class="item flex-between" tabindex="0">
        <div class="flex-col clear-mins">
          <div class="fs-title flex-row-center">
            {#if icon}
              <div class="icon"><Icon {icon} size={'small'} /></div>
            {/if}
            <SpacePresenter value={space} />
          </div>
          <div class="flex-row-center">
            {#if joined}
              <Label label={plugin.string.Joined} />
              &#183
            {/if}
            {space.members.length}
            &#183
            {space.description}
          </div>
        </div>
        <div class="tools flex-row-center gap-2">
          {#if joined}
            <Button size={'x-large'} label={plugin.string.Leave} on:click={() => leave(space)} />
          {:else}
            <Button size={'x-large'} label={plugin.string.View} on:click={() => view(space)} />
            <Button size={'x-large'} kind={'accented'} label={plugin.string.Join} on:click={() => join(space)} />
          {/if}
        </div>
      </div>
    {/each}
  </div>
  {#if createItemDialog}
    <div class="flex-center mt-10">
      <Button size={'x-large'} kind={'accented'} label={createItemLabel} on:click={(ev) => showCreateDialog(ev)} />
    </div>
  {/if}
</Scroller>

<style lang="scss">
  .spaces-container {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--theme-list-border-color);
    border-radius: 0.25rem;

    .item {
      padding: 1rem 0.75rem;
      color: var(--theme-caption-color);
      cursor: pointer;

      .icon {
        margin-right: 0.375rem;
        color: var(--theme-trans-color);
      }
      &:not(:last-child) {
        border-bottom: 1px solid var(--theme-divider-color);
      }
      &:hover,
      &:focus {
        background-color: var(--highlight-hover);

        .icon {
          color: var(--theme-caption-color);
        }
        .tools {
          visibility: visible;
        }
      }
      .tools {
        position: relative;
        visibility: hidden;
      }
    }
  }
</style>
