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
  import { AccountRole, getCurrentAccount, hasAccountRole, Ref } from '@hcengineering/core'
  import { ButtonIcon, getCurrentLocation, IconAdd, location, Menu, navigate, showPopup } from '@hcengineering/ui'

  import { MasterTag } from '@hcengineering/card'
  import card from '../../plugin'
  import CreateSpace from './CreateSpace.svelte'
  import CreateCardPopup from '../CreateCardPopup.svelte'

  const me = getCurrentAccount()

  let pressed: boolean = false

  $: _class = $location.path[4] as Ref<MasterTag>
  $: space = $location.path[3]

  async function navigateToCard (cardId: string): Promise<void> {
    const loc = getCurrentLocation()
    loc.path[3] = cardId
    loc.path.length = 4
    navigate(loc)
  }

  async function handleCreateCard (): Promise<void> {
    console.log('Creating card of type', _class, 'in space', space)
    showPopup(CreateCardPopup, { type: _class, space }, 'center', async (result) => {
      if (result != null && result !== '') {
        await navigateToCard(result)
      }
    })
  }

  async function newTeamspace (): Promise<void> {
    showPopup(CreateSpace, {}, 'top')
  }

  const globalActions = hasAccountRole(me, AccountRole.User)
    ? [
        {
          label: card.string.CreateCard,
          icon: IconAdd,
          action: handleCreateCard
        },
        {
          label: card.string.CreateSpace,
          icon: IconAdd,
          action: newTeamspace
        }
      ]
    : [
        {
          label: card.string.CreateCard,
          icon: IconAdd,
          action: handleCreateCard
        }
      ]

  function addButtonClicked (ev: MouseEvent): void {
    pressed = true
    showPopup(Menu, { actions: globalActions }, ev.target as HTMLElement, () => {
      pressed = false
    })
  }
</script>

<ButtonIcon icon={IconAdd} hasMenu {pressed} kind={'primary'} size={'small'} on:click={addButtonClicked} />
