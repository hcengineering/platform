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
  import core, { getCurrentAccount, PersonId, Ref } from '@hcengineering/core'
  import presentation from '@hcengineering/presentation'
  import { Label, showPopup, tooltip } from '@hcengineering/ui'

  import { Channel, ChunterSpace, ObjectChatPanel } from '@hcengineering/chunter'
  import { Person } from '@hcengineering/contact'
  import { EmployeeBox, personRefByPersonIdStore, primarySocialIdByPersonRefStore, socialIdsByPersonRefStore, SelectUsersPopup } from '@hcengineering/contact-resources'

  import ChannelMembers from '../ChannelMembers.svelte'
  import DocAside from './DocAside.svelte'
  import { joinChannel, leaveChannel } from '../../utils'

  export let object: ChunterSpace
  export let objectChatPanel: ObjectChatPanel | undefined

  const socialStrings = getCurrentAccount().socialIds

  let members = new Set<Ref<Person>>()

  $: creatorPersonRef = object.createdBy !== undefined
    ? $personRefByPersonIdStore.get(object.createdBy)
    : undefined

  $: disabledRemoveFor = (object.createdBy !== undefined && !socialStrings.includes(object.createdBy) && creatorPersonRef !== undefined) ? [creatorPersonRef] : []
  $: updateMembers(object)

  function updateMembers (object: Channel | undefined): void {
    if (object === undefined) {
      members = new Set()
      return
    }

    members = new Set(
      object.members
        .map((personId) => $personRefByPersonIdStore.get(personId))
        .filter((p) => p !== undefined)
    )
  }

  function personsToPrimaryIds (persons: Ref<Person>[]): PersonId[] {
    return persons.map((person) => $primarySocialIdByPersonRefStore.get(person)).filter((s) => s !== undefined)
  }

  function personsToAllSocialIds (persons: Ref<Person>[]): PersonId[] {
    return persons.map((person) => $socialIdsByPersonRefStore.get(person)?.map((si) => si.key) ?? []).flat().filter((s) => s !== undefined)
  }

  async function changeMembers (personRefs: Ref<Person>[], object?: Channel): Promise<void> {
    if (object === undefined) {
      return
    }

    const personsToLeave = Array.from(members).filter((_id) => !personRefs.includes(_id))
    const allSocialStringsToLeave = personsToAllSocialIds(personsToLeave)
    const socialStringsToLeave = object.members.filter((s) => allSocialStringsToLeave.includes(s))

    const personsToJoin = personRefs.filter((_id) => !members.has(_id))
    const socialStringsToJoin = personsToPrimaryIds(personsToJoin)

    await Promise.all([leaveChannel(object, socialStringsToLeave), joinChannel(object, socialStringsToJoin)])
  }

  async function removeMember (ev: CustomEvent): Promise<void> {
    if (object === undefined) {
      return
    }

    const personId = ev.detail as Ref<Person> | undefined

    if (personId === undefined) {
      return
    }

    const allSocialStringsToLeave = personsToAllSocialIds([personId])
    const socialStringsToLeave = object.members.filter((s) => allSocialStringsToLeave.includes(s))

    await leaveChannel(object, socialStringsToLeave)
  }

  function openSelectUsersPopup (): void {
    showPopup(
      SelectUsersPopup,
      {
        okLabel: presentation.string.Add,
        disableDeselectFor: disabledRemoveFor,
        skipInactive: true,
        selected: members,
        showStatus: true
      },
      'top',
      (result?: Ref<Person>[]) => {
        if (result != null) {
          void changeMembers(result, object)
        }
      }
    )
  }
  $: readonly = object?.archived ?? false
</script>

<DocAside {object} {objectChatPanel}>
  {#if creatorPersonRef}
    <div class="popupPanel-body__aside-grid" style:margin-top="0">
      <span
        class="labelOnPanel"
        use:tooltip={{
          component: Label,
          props: { label: core.string.CreatedBy }
        }}
      >
        <Label label={core.string.CreatedBy} />
      </span>
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
      {readonly}
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
