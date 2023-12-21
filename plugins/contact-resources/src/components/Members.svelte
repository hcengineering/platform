<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import { Member } from '@hcengineering/contact'
  import type { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, IconAdd, Label, Section, showPopup } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { Table, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import contact from '../plugin'
  import UsersPopup from './UsersPopup.svelte'
  import IconMembersOutline from './icons/MembersOutline.svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  export let members: number

  let memberItems: Member[] = []

  const membersQuery = createQuery()
  $: membersQuery.query(contact.class.Member, { attachedTo: objectId }, (result) => {
    memberItems = result
  })

  const client = getClient()
  let loading = true

  const createApp = async (ev: MouseEvent): Promise<void> => {
    showPopup(
      UsersPopup,
      {
        _class: contact.class.Person,
        options: undefined,
        ignoreUsers: memberItems.map((it) => it.contact),
        icon: contact.icon.Person,
        allowDeselect: false,
        placeholder: contact.string.Member,
        create: { component: contact.component.CreatePerson, label: contact.string.CreatePerson }
      },
      ev.target as HTMLElement,
      (result) => {
        if (result != null) {
          client.addCollection(contact.class.Member, space, objectId, _class, 'members', {
            contact: result._id
          })
        }
      }
    )
  }

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
</script>

<Section label={contact.string.Members} icon={IconMembersOutline}>
  <svelte:fragment slot="header">
    <div class="buttons-group xsmall-gap">
      <ViewletSelector
        hidden
        bind:viewlet
        bind:preference
        bind:loading
        viewletQuery={{ _id: contact.viewlet.TableMember }}
      />
      <ViewletSettingButton kind={'ghost'} bind:viewlet />
      <Button id={contact.string.AddMember} icon={IconAdd} kind={'ghost'} on:click={createApp} />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="content">
    {#if members > 0 && viewlet}
      <Table
        _class={contact.class.Member}
        config={preference?.config ?? viewlet.config}
        options={viewlet.options}
        query={{ attachedTo: objectId }}
        loadingProps={{ length: members }}
      />
    {:else}
      <div class="antiSection-empty solid flex-col mt-3">
        <span class="content-dark-color">
          <Label label={contact.string.NoMembers} />
        </span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="over-underline content-color" on:click={createApp}>
          <Label label={contact.string.AddMember} />
        </span>
      </div>
    {/if}
  </svelte:fragment>
</Section>
