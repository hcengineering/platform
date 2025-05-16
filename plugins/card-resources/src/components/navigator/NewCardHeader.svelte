<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { AccountRole, getCurrentAccount, hasAccountRole, Ref, Space } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import {
    Button,
    ButtonWithDropdown,
    getCurrentLocation,
    IconAdd,
    IconDropdown,
    Loading,
    location,
    navigate,
    SelectPopupValueType,
    showPopup
  } from '@hcengineering/ui'

  import { MasterTag } from '@hcengineering/card'
  import card from '../../plugin'
  import CreateSpace from './CreateSpace.svelte'
  import { createCard } from '../../utils'

  export let currentSpace: Ref<Space> | undefined

  const query = createQuery()
  const me = getCurrentAccount()

  let loading = true
  let hasSpace = false
  query.query(
    card.class.CardSpace,
    { archived: false, members: me.uuid },
    (res) => {
      hasSpace = res.length > 0
      loading = false
    },
    { limit: 1, projection: { _id: 1 } }
  )

  $: _class = $location.path[4] as Ref<MasterTag>

  async function handleCreateCard (): Promise<void> {
    if (_class === undefined || currentSpace === undefined) return
    const _id = await createCard(_class, currentSpace)
    const loc = getCurrentLocation()

    loc.path[3] = _id
    loc.path.length = 4
    navigate(loc)
  }

  async function newTeamspace (): Promise<void> {
    showPopup(CreateSpace, {}, 'top')
  }

  async function dropdownItemSelected (res?: SelectPopupValueType['id']): Promise<void> {
    if (res === 'card') {
      await handleCreateCard()
    } else if (res === 'space') {
      await newTeamspace()
    }
  }

  const dropdownItems = hasAccountRole(me, AccountRole.User)
    ? [
        { id: 'card', label: card.string.CreateCard },
        { id: 'space', label: card.string.CreateSpace }
      ]
    : [{ id: 'card', label: card.string.CreateCard }]
</script>

{#if loading}
  <Loading shrink />
{:else if hasAccountRole(getCurrentAccount(), AccountRole.User) || hasSpace}
  <div class="antiNav-subheader">
    {#if hasAccountRole(getCurrentAccount(), AccountRole.User)}
      {#if hasSpace && currentSpace !== undefined && _class !== undefined}
        <ButtonWithDropdown
          icon={IconAdd}
          justify={'left'}
          kind={'primary'}
          label={card.string.CreateCard}
          on:click={handleCreateCard}
          mainButtonId={'new-document'}
          dropdownIcon={IconDropdown}
          {dropdownItems}
          on:dropdown-selected={(ev) => {
            void dropdownItemSelected(ev.detail)
          }}
        />
      {:else}
        <Button
          id={'new-teamspace'}
          icon={IconAdd}
          label={card.string.CreateSpace}
          justify={'left'}
          width={'100%'}
          kind={'primary'}
          gap={'large'}
          on:click={newTeamspace}
        />
      {/if}
    {:else if hasSpace}
      <Button
        id={'new-document'}
        icon={IconAdd}
        label={card.string.CreateCard}
        justify={'left'}
        width={'100%'}
        kind={'primary'}
        gap={'large'}
        disabled={currentSpace === undefined || _class === undefined}
        on:click={handleCreateCard}
      />
    {/if}
  </div>
{/if}
