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
  import { Member } from '@anticrm/contact'
  import type { Class, Doc, Ref, Space } from '@anticrm/core'
  import { createQuery, getClient, UsersPopup } from '@anticrm/presentation'
  import { CircleButton, IconAdd, Label, showPopup } from '@anticrm/ui'
  import view, { Viewlet, ViewletPreference } from '@anticrm/view'
  import { Table, ViewletSettingButton } from '@anticrm/view-resources'
  import contact from '../plugin'

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
</script>

<div class="applications-container">
  <div class="flex flex-between">
    <div class="title"><Label label={contact.string.Members} /></div>
    <CircleButton id={contact.string.AddMember} icon={IconAdd} size={'small'} selected on:click={createApp} />
    <div class="flex flex-grow flex-reverse">
      <ViewletSettingButton viewlet={descr} />
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
    <div class="flex-col-center mt-5 createapp-container">
      <div class="text-sm content-dark-color mt-2">
        <Label label={contact.string.NoMembers} />
      </div>
      <div class="text-sm">
        <div class="over-underline" on:click={createApp}><Label label={contact.string.AddMember} /></div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .applications-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: 0.75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .createapp-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
  }
</style>
