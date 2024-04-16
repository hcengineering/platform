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
  import core, { Account, Class, getCurrentAccount, Ref } from '@hcengineering/core'
  import presentation from '@hcengineering/presentation'
  import { Label, showPopup, tooltip } from '@hcengineering/ui'

  import { Channel, ChunterSpace } from '@hcengineering/chunter'
  import { Person, PersonAccount } from '@hcengineering/contact'
  import { EmployeeBox, personAccountByIdStore, SelectUsersPopup } from '@hcengineering/contact-resources'

  import ChannelMembers from '../ChannelMembers.svelte'
  import DocAside from './DocAside.svelte'
  import { joinChannel, leaveChannel } from '../../utils'

  export let _class: Ref<Class<ChunterSpace>>
  export let object: ChunterSpace | undefined

  const currentAccount = getCurrentAccount()

  let members = new Set<Ref<Person>>()

  $: creatorPersonRef = object?.createdBy
    ? $personAccountByIdStore.get(object.createdBy as Ref<PersonAccount>)?.person
    : undefined

  $: disabledRemoveFor = currentAccount._id !== object?.createdBy && creatorPersonRef ? [creatorPersonRef] : []
  $: updateMembers(object)

  function updateMembers (object: Channel | undefined): void {
    if (object === undefined) {
      members = new Set()
      return
    }

    members = new Set(
      object.members
        .map((accountId) => {
          const personAccount = $personAccountByIdStore.get(accountId as Ref<PersonAccount>)
          if (personAccount === undefined) {
            return undefined
          }
          return personAccount.person
        })
        .filter((_id): _id is Ref<Person> => !!_id)
    )
  }

  async function changeMembers (personRefs: Ref<Person>[], object?: Channel): Promise<void> {
    if (object === undefined) {
      return
    }

    const personAccounts = Array.from($personAccountByIdStore.values())

    const newMembers: Ref<Account>[] = personAccounts
      .filter(({ person }) => personRefs.includes(person))
      .map(({ _id }) => _id)

    const toLeave = object.members.filter((_id) => !newMembers.includes(_id))
    const toJoin = newMembers.filter((_id) => !object.members.includes(_id))

    await Promise.all([leaveChannel(object, toLeave), joinChannel(object, toJoin)])
  }

  async function removeMember (ev: CustomEvent): Promise<void> {
    if (object === undefined) {
      return
    }

    const personId = ev.detail as Ref<Person> | undefined

    if (personId === undefined) {
      return
    }

    const accounts = Array.from($personAccountByIdStore.values())
      .filter((account) => account.person === personId)
      .map(({ _id }) => _id)

    if (accounts.length === 0) {
      return
    }

    await leaveChannel(object, accounts)
  }

  function openSelectUsersPopup (): void {
    showPopup(
      SelectUsersPopup,
      {
        okLabel: presentation.string.Add,
        disableDeselectFor: disabledRemoveFor,
        selected: members
      },
      'top',
      (result?: Ref<Person>[]) => {
        if (result != null) {
          void changeMembers(result, object)
        }
      }
    )
  }
</script>

<DocAside {_class} {object}>
  {#if object && creatorPersonRef}
    <div class="popupPanel-body__aside-grid" style:margin-top="0">
      <span
        class="labelOnPanel"
        use:tooltip={{
          component: Label,
          props: { label: core.string.CreatedBy }
        }}><Label label={core.string.CreatedBy} /></span
      >
      <div class="flex flex-grow min-w-0">
        <EmployeeBox
          value={creatorPersonRef}
          label={core.string.CreatedBy}
          kind={'link'}
          size={'medium'}
          avatarSize={'card'}
          width={'100%'}
          showNavigate={false}
          readonly
        />
      </div>
    </div>
  {/if}

  <div class="members">
    <ChannelMembers
      ids={Array.from(members)}
      disableRemoveFor={disabledRemoveFor}
      on:add={openSelectUsersPopup}
      on:remove={removeMember}
    />
  </div>
</DocAside>

<style lang="scss">
  .members {
    padding: var(--spacing-2);
  }
</style>
