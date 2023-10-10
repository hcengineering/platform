<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import chunter, { getDirectChannel } from '@hcengineering/chunter'
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import { Class, Doc, Ref, getCurrentAccount } from '@hcengineering/core'
  import { DocUpdates } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Button,
    Component,
    IconAdd,
    Tabs,
    eventToHTMLElement,
    getLocation,
    navigate,
    showPopup,
    defineSeparators,
    Separator
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import contact from '@hcengineering/contact'
  import { UsersPopup } from '@hcengineering/contact-resources'

  import notification from '../plugin'
  import Activity from './Activity.svelte'
  import EmployeeInbox from './EmployeeInbox.svelte'
  import Filter from './Filter.svelte'
  import People from './People.svelte'
  import { subscribe } from '../utils'

  export let visibileNav: boolean
  let filter: 'all' | 'read' | 'unread' = 'all'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: tabs = [
    {
      label: notification.string.Activity,
      props: { filter, _id },
      component: Activity
    },
    {
      label: notification.string.People,
      props: { filter, _id },
      component: People
    }
  ]

  let component: AnyComponent | undefined
  let _id: Ref<Doc> | undefined
  let _class: Ref<Class<Doc>> | undefined
  let selectedEmployee: Ref<PersonAccount> | undefined = undefined

  async function select (value: DocUpdates | undefined) {
    if (!value) {
      component = undefined
      _id = undefined
      _class = undefined
      return
    }

    const isDmOpened = hierarchy.isDerived(value.attachedToClass, chunter.class.ChunterSpace)
    if (!isDmOpened && value !== undefined) {
      // chats messages are marked as read explicitly, but
      // other notifications should be marked as read upon opening
      if (value.txes.some((p) => p.isNew)) {
        value.txes.forEach((p) => (p.isNew = false))
        const txes = value.txes
        await client.update(value, { txes })
      }
    }

    if (hierarchy.isDerived(value.attachedToClass, chunter.class.ChunterSpace)) {
      openDM(value.attachedTo)
    } else {
      const panelComponent = hierarchy.classHierarchyMixin(value.attachedToClass, view.mixin.ObjectPanel)
      component = panelComponent?.component ?? view.component.EditDoc
      _id = value.attachedTo
      _class = value.attachedToClass
    }
  }

  function openDM (value: Ref<Doc>) {
    if (value) {
      const panelComponent = hierarchy.classHierarchyMixin(
        chunter.class.DirectMessage as Ref<Class<Doc>>,
        view.mixin.ObjectPanel
      )
      component = panelComponent?.component ?? view.component.EditDoc
      _id = value
      _class = chunter.class.DirectMessage
      const loc = getLocation()
      loc.path[3] = _id
      navigate(loc)
    }
  }

  let selectedTab = 0

  const me = getCurrentAccount() as PersonAccount

  function openUsersPopup (ev: MouseEvent) {
    showPopup(
      UsersPopup,
      { _class: contact.mixin.Employee, docQuery: { _id: { $ne: me.person } } },
      eventToHTMLElement(ev),
      async (employee: Employee) => {
        if (employee != null) {
          const personAccount = await client.findOne(contact.class.PersonAccount, { person: employee._id })
          if (personAccount !== undefined) {
            const channel = await getDirectChannel(client, me._id as Ref<PersonAccount>, personAccount._id)

            // re-subscribing in case DM was removed from notifications
            await subscribe(chunter.class.DirectMessage, channel)

            openDM(channel)
          }
        }
      }
    )
  }
  defineSeparators('inbox', [{ minSize: 20, maxSize: 40, size: 30 }, null])
</script>

<div class="flex-row-top h-full">
  {#if visibileNav}
    <div class="antiPanel-component header aside min-w-100 flex-no-shrink">
      <Tabs
        bind:selected={selectedTab}
        model={tabs}
        on:change={(e) => select(e.detail)}
        on:open={(e) => {
          selectedEmployee = e.detail
          select(undefined)
        }}
        padding={'0 1.75rem'}
        size="small"
      >
        <svelte:fragment slot="rightButtons">
          <div class="flex flex-gap-2">
            {#if selectedTab > 0}
              <Button label={chunter.string.Message} icon={IconAdd} kind="accented" on:click={openUsersPopup} />
            {/if}
            <Filter bind:filter />
          </div>
        </svelte:fragment>
      </Tabs>
    </div>
    <Separator name={'inbox'} index={0} />
  {/if}
  <div class="antiPanel-component filled w-full">
    {#if selectedEmployee !== undefined && component === undefined}
      <EmployeeInbox
        accountId={selectedEmployee}
        on:change={(e) => select(e.detail)}
        on:dm={(e) => openDM(e.detail)}
        on:close={() => {
          selectedEmployee = undefined
        }}
      />
    {:else if component && _id && _class}
      <Component
        is={component}
        props={{ _id, _class, embedded: selectedTab === 0 }}
        on:close={() => select(undefined)}
      />
    {/if}
  </div>
</div>
