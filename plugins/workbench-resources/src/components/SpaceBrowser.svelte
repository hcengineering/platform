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
  import { Class, FindOptions, getCurrentAccount, Ref, SortingOrder, SortingQuery, Space } from '@anticrm/core'
  import {
    AnyComponent,
    Button,
    getCurrentLocation,
    Icon,
    Label,
    navigate,
    Scroller,
    SearchEdit,
    showPopup
  } from '@anticrm/ui'
  import presentation, { createQuery, getClient } from '@anticrm/presentation'
  import plugin from '../plugin'
  import { SpacePresenter } from '@anticrm/view-resources'
  import { IntlString } from '@anticrm/platform'
  import { classIcon } from '../utils'

  export let _class: Ref<Class<Space>>
  export let label: IntlString
  export let createItemDialog: AnyComponent | undefined
  export let createItemLabel: IntlString = presentation.string.Create

  const me = getCurrentAccount()._id
  const client = getClient()
  const spaceQuery = createQuery()
  let search: string = ''
  const sort: SortingQuery<Space> = {
    name: SortingOrder.Ascending
  }

  let spaces: Space[] = []

  $: update(search, sort)

  async function update (search: string, sort: SortingQuery<Space>): Promise<void> {
    const query = search.trim().length > 0 ? { name: { $like: '%' + search + '%' } } : {}
    const options: FindOptions<Space> = {
      sort
    }
    spaceQuery.query(
      _class,
      query,
      (res) => {
        spaces = res.filter((p) => !p.private || p.members.includes(me))
      },
      options
    )
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
    const loc = getCurrentLocation()
    loc.path[2] = space._id
    navigate(loc)
  }
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label {label} /></span>
  </div>
  {#if createItemDialog}
    <Button label={createItemLabel} on:click={(ev) => showCreateDialog(ev)} />
  {/if}
</div>
<div class="ml-8 mr-8 mt-4"><SearchEdit bind:value={search} /></div>
<Scroller padding={'2.5rem'}>
  <div class="flex-col">
    {#each spaces as space (space._id)}
      {@const icon = classIcon(client, space._class)}
      {@const joined = space.members.includes(me)}
      <div class="divider" />
      <div class="item flex-between">
        <div>
          <div class="fs-title flex">
            {#if icon}
              <Icon {icon} size={'small'} />
            {/if}
            <SpacePresenter value={space} />
          </div>
          <div>
            {#if joined}
              <Label label={plugin.string.Joined} />
              &#183
            {/if}
            {space.members.length}
            &#183
            {space.description}
          </div>
        </div>
        <div class="tools flex">
          {#if joined}
            <Button size={'x-large'} label={plugin.string.Leave} on:click={() => leave(space)} />
          {:else}
            <div class="mr-2">
              <Button size={'x-large'} label={plugin.string.View} on:click={() => view(space)} />
            </div>
            <Button size={'x-large'} kind={'primary'} label={plugin.string.Join} on:click={() => join(space)} />
          {/if}
        </div>
      </div>
    {/each}
    <div class="flex-center mt-10">
      <Button size={'x-large'} kind={'primary'} label={createItemLabel} on:click={(ev) => showCreateDialog(ev)} />
    </div>
  </div>
</Scroller>

<style lang="scss">
  .divider {
    background-color: var(--theme-dialog-divider);
    height: 1px;
  }

  .item {
    color: var(--caption-color);
    cursor: pointer;
    padding: 1rem 0.75rem;

    &:hover,
    &:focus {
      background-color: var(--popup-bg-hover);

      .tools {
        visibility: visible;
      }
    }
    .tools {
      position: relative;
      visibility: hidden;
    }
  }
</style>
