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
  import { DirectMessage } from '@hcengineering/chunter'
  import contact, { PersonAccount } from '@hcengineering/contact'
  import { CombineAvatars } from '@hcengineering/contact-resources'
  import type { Ref } from '@hcengineering/core'
  import { getCurrentAccount } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { SearchEdit } from '@hcengineering/ui'
  import { openDoc } from '@hcengineering/view-resources'
  import { userSearch } from '../index'
  import chunter from '../plugin'
  import { getDmName, navigateToSpecial } from '../utils'

  export let spaceId: Ref<DirectMessage> | undefined
  export let withSearch: boolean = true

  let userSearch_: string = ''
  userSearch.subscribe((v) => (userSearch_ = v))

  const client = getClient()
  const query = createQuery()
  const myAccId = getCurrentAccount()._id
  let dm: DirectMessage | undefined

  $: query.query(chunter.class.DirectMessage, { _id: spaceId }, (result) => {
    dm = result[0]
  })

  async function getEmpolyeeIds () {
    const empAccIds = dm?.members.length !== 1 ? dm?.members.filter((accId) => accId !== myAccId) : dm?.members

    const employeeAccounts = await client.findAll(contact.class.PersonAccount, {
      _id: { $in: empAccIds as Ref<PersonAccount>[] }
    })

    return employeeAccounts.map((ea) => ea.person)
  }

  async function onSpaceEdit (): Promise<void> {
    if (dm === undefined) return
    openDoc(client.getHierarchy(), dm)
  }
</script>

<div class="ac-header divide full caption-height">
  {#if dm}
    {#await getDmName(client, dm) then name}
      {#await getEmpolyeeIds() then empolyeeIds}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="ac-header__wrap-title" on:click={onSpaceEdit}>
          <div class="ac-header__icon">
            <CombineAvatars _class={contact.mixin.Employee} items={empolyeeIds} size={'x-small'} />
          </div>
          <span class="ac-header__title">{name}</span>
        </div>
      {/await}
    {/await}
  {/if}
  {#if withSearch}
    <SearchEdit
      value={userSearch_}
      on:change={(ev) => {
        userSearch.set(ev.detail)

        if (ev.detail !== '') {
          navigateToSpecial('chunterBrowser')
        }
      }}
    />
  {/if}
</div>

<style lang="scss">
  .ac-header__wrap-title:hover {
    cursor: pointer;
    span {
      text-decoration: underline;
    }
  }
</style>
