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
  import chunter from '@hcengineering/chunter'
  import { PersonAccount } from '@hcengineering/contact'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { DocUpdates } from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component, Tabs } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import notification from '../plugin'
  import Activity from './Activity.svelte'
  import EmployeeInbox from './EmployeeInbox.svelte'
  import Filter from './Filter.svelte'
  import People from './People.svelte'

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
  let prevValue: DocUpdates | undefined = undefined

  async function select (value: DocUpdates | undefined) {
    if (!value) {
      component = undefined
      _id = undefined
      _class = undefined
      return
    }
    if (prevValue !== undefined) {
      if (prevValue.txes.some((p) => p.isNew)) {
        prevValue.txes.forEach((p) => (p.isNew = false))
        const txes = prevValue.txes
        await client.update(prevValue, { txes })
      }
    }
    const targetClass = hierarchy.getClass(value.attachedToClass)
    const panelComponent = hierarchy.as(targetClass, view.mixin.ObjectPanel)
    component = panelComponent.component ?? view.component.EditDoc
    _id = value.attachedTo
    _class = value.attachedToClass
    prevValue = value
  }

  function openDM (value: Ref<Doc>) {
    if (value) {
      const targetClass = hierarchy.getClass(chunter.class.DirectMessage)
      const panelComponent = hierarchy.as(targetClass, view.mixin.ObjectPanel)
      component = panelComponent.component ?? view.component.EditDoc
      _id = value
      _class = chunter.class.DirectMessage
    }
  }

  let selectedTab = 0
</script>

<div class="flex-row-top h-full">
  {#if visibileNav}
    <div class="antiPanel-component header border-right aside min-w-100 flex-no-shrink">
      {#if selectedEmployee === undefined}
        <Tabs
          bind:selected={selectedTab}
          model={tabs}
          on:change={(e) => select(e.detail)}
          on:open={(e) => {
            selectedEmployee = e.detail
          }}
          padding={'0 1.75rem'}
          size="small"
        >
          <svelte:fragment slot="rightButtons">
            <Filter bind:filter />
          </svelte:fragment>
        </Tabs>
      {:else}
        <EmployeeInbox
          accountId={selectedEmployee}
          on:change={(e) => select(e.detail)}
          on:dm={(e) => openDM(e.detail)}
          on:close={(e) => {
            selectedEmployee = undefined
          }}
        />
      {/if}
    </div>
  {/if}
  <div class="antiPanel-component filled w-full">
    {#if component && _id && _class}
      <Component is={component} props={{ embedded: true, _id, _class }} />
    {/if}
  </div>
</div>
