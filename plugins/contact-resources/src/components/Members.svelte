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
  import { Button, IconAdd, Label, showPopup, Icon } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import IconMembersOutline from './icons/MembersOutline.svelte'
  import {
    getViewOptions,
    setActiveViewletId,
    Table,
    ViewletSettingButton,
    viewOptionStore
  } from '@hcengineering/view-resources'
  import contact from '../plugin'
  import UsersPopup from './UsersPopup.svelte'

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

  let descr: Viewlet | undefined

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  $: updateDescriptor(contact.viewlet.TableMember)

  function updateDescriptor (id: Ref<Viewlet>) {
    loading = true
    client
      .findOne<Viewlet>(view.class.Viewlet, {
        _id: id
      })
      .then((res) => {
        descr = res
        if (res !== undefined) {
          setActiveViewletId(res._id)
          preferenceQuery.query(
            view.class.ViewletPreference,
            {
              attachedTo: res._id
            },
            (res) => {
              preference = res[0]
              loading = false
            },
            { limit: 1 }
          )
        }
      })
  }
  $: viewOptions = getViewOptions(descr, $viewOptionStore)
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={IconMembersOutline} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label label={contact.string.Members} />
    </span>
    <div class="buttons-group xsmall-gap">
      <ViewletSettingButton bind:viewOptions viewlet={descr} kind={'ghost'} />
      <Button id={contact.string.AddMember} icon={IconAdd} kind={'ghost'} on:click={createApp} />
    </div>
  </div>
  {#if members > 0 && descr}
    <Table
      _class={contact.class.Member}
      config={preference?.config ?? descr.config}
      options={descr.options}
      query={{ attachedTo: objectId }}
      loadingProps={{ length: members }}
    />
  {:else}
    <div class="antiSection-empty solid flex-col mt-3">
      <span class="content-dark-color">
        <Label label={contact.string.NoMembers} />
      </span>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <span class="over-underline content-color" on:click={createApp}>
        <Label label={contact.string.AddMember} />
      </span>
    </div>
  {/if}
</div>
