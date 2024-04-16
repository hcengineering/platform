<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { AnyComponent, Button, Icon, Label, Scroller, SearchEdit, showPopup } from '@hcengineering/ui'
  import { FilterBar, FilterButton, SpacePresenter } from '@hcengineering/view-resources'
  import workbench from '@hcengineering/workbench'
  import { Channel } from '@hcengineering/chunter'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'

  import { openChannel } from '../../../navigation'
  import { getObjectIcon, joinChannel, leaveChannel } from '../../../utils'
  import chunter from './../../../plugin'

  export let _class: Ref<Class<Channel>> = chunter.class.Channel
  export let label: IntlString
  export let createItemDialog: AnyComponent | undefined = undefined
  export let createItemLabel: IntlString = presentation.string.Create
  export let withHeader: boolean = true
  export let withFilterButton: boolean = true
  export let search: string = ''

  const me = getCurrentAccount()._id
  const channelsQuery = createQuery()

  const client = getClient()
  const notificationsClient = InboxNotificationsClientImpl.getClient()

  const sort: SortingQuery<Space> = {
    name: SortingOrder.Ascending
  }

  let searchQuery: DocumentQuery<Channel>
  let resultQuery: DocumentQuery<Channel>

  let channels: Channel[] = []

  $: updateSearchQuery(search)
  $: update(sort, resultQuery)

  async function update (sort: SortingQuery<Channel>, resultQuery: DocumentQuery<Channel>): Promise<void> {
    const options: FindOptions<Channel> = {
      sort
    }

    channelsQuery.query(
      _class,
      {
        ...resultQuery,
        private: false
      },
      (res) => {
        channels = res
      },
      options
    )
  }

  function updateSearchQuery (search: string): void {
    searchQuery = search.length ? { $search: search } : {}
  }

  function showCreateDialog (_: Event) {
    showPopup(createItemDialog as AnyComponent, {}, 'middle')
  }

  async function join (channel: Channel): Promise<void> {
    if (channel.members.includes(me)) {
      return
    }

    await joinChannel(channel, me)
  }

  async function leave (channel: Channel): Promise<void> {
    if (!channel.members.includes(me)) {
      return
    }
    await leaveChannel(channel, me)
  }

  async function view (channel: Channel): Promise<void> {
    openChannel(channel._id, channel._class)
  }
</script>

{#if withHeader}
  <div class="ac-header full divide">
    <div class="ac-header__wrap-title">
      <span class="ac-header__title"><Label {label} /></span>
    </div>
    {#if createItemDialog}
      <div class="mb-1 clear-mins">
        <Button
          label={createItemLabel}
          kind={'primary'}
          size={'medium'}
          on:click={(ev) => {
            showCreateDialog(ev)
          }}
        />
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
    {#each channels as channel (channel._id)}
      {@const icon = getObjectIcon(channel._class)}
      {@const joined = channel.members.includes(me)}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <div class="item flex-between" tabindex="0">
        <div class="flex-col clear-mins">
          <div class="fs-title flex-row-center">
            {#if icon}
              <div class="icon"><Icon {icon} size={'small'} /></div>
            {/if}
            <SpacePresenter value={channel} />
          </div>
          <div class="flex-row-center">
            {#if joined}
              <Label label={workbench.string.Joined} />
              &#183
            {/if}
            {channel.members.length}
            &#183
            {channel.description}
          </div>
        </div>
        <div class="tools flex-row-center gap-2">
          {#if joined}
            <Button
              size={'x-large'}
              label={workbench.string.Leave}
              on:click={async () => {
                await leave(channel)
              }}
            />
          {:else}
            <Button
              size={'x-large'}
              label={workbench.string.View}
              on:click={async () => {
                await view(channel)
              }}
            />
            <Button
              size={'x-large'}
              kind={'primary'}
              label={workbench.string.Join}
              on:click={async () => {
                await join(channel)
              }}
            />
          {/if}
        </div>
      </div>
    {/each}
  </div>
  {#if createItemDialog}
    <div class="flex-center mt-10">
      <Button
        size={'x-large'}
        kind={'primary'}
        label={createItemLabel}
        on:click={(ev) => {
          showCreateDialog(ev)
        }}
      />
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
