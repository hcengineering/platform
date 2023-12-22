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
  import { Button, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { Table, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import contact from '../plugin'
  import UsersPopup from './UsersPopup.svelte'
  import IconMembersOutline from './icons/MembersOutline.svelte'
  import { onMount } from 'svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  export let members: number
  let memberItems: Member[] = []

  const client = getClient()
  let loading = true
  const membersQuery = createQuery()
  $: membersQuery.query(contact.class.Member, { attachedTo: objectId }, (result) => {
    memberItems = result
  })


  const createApp = async (ev: MouseEvent): Promise<void> => {
    showPopup(
      UsersPopup,
      {
        _class: contact.class.Person,
        options: undefined,
        icon: contact.icon.Person,
        allowDeselect: true,
        multiSelect: true,
        placeholder: contact.string.Member,
        create: { component: contact.component.CreatePerson, label: contact.string.CreatePerson }, 
        ignoreUsers: memberItems.map((it) => it.contact),
      },
      ev.target as HTMLElement,
      undefined,
      (result) => {
        if (result && result.length > 0) {
        for (const userId of result) {
          client.addCollection(contact.class.Member, space, objectId, _class, 'member', {
            contact: userId,
          });
        }
      }
    }
    )
  }

  onMount(()=>{
   createApp
  })

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
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
  </div>
  {#if members > 0 && viewlet}
  <div class="scroll relative flex-shrink svelte-77kg2x">
    <Table
      _class={contact.class.Member}
      config={preference?.config ?? viewlet.config}
      options={viewlet.options}
      query={{ attachedTo: objectId }}
      loadingProps={{ length: members }}
    />
  </div>
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
</div>
