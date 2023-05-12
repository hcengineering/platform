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
  import activity, { TxViewlet } from '@hcengineering/activity'
  import { activityKey, ActivityKey } from '@hcengineering/activity-resources'
  import { Class, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component, Label, ListView, Loading, Scroller } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ActionContext, ListSelectionProvider, SelectDirection } from '@hcengineering/view-resources'
  import NotificationView from './NotificationView.svelte'

  export let visibileNav: boolean

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()

  let docs: DocUpdates[] = []
  let loading = true

  $: query.query(
    notification.class.DocUpdates,
    {
      user: getCurrentAccount()._id,
      hidden: false
    },
    (res) => {
      docs = res
      listProvider.update(docs)
      if (loading || _id === undefined) {
        changeSelected(selected)
      } else if (docs.find((p) => p.attachedTo === _id) === undefined) {
        changeSelected(selected)
      }
      loading = false
    },
    {
      sort: {
        lastTxTime: -1
      }
    }
  )

  $: changeSelected(selected)

  function changeSelected (index: number) {
    if (docs[index] !== undefined) {
      select(docs[index])
    } else if (docs.length) {
      if (index < docs.length - 1) {
        selected++
      } else {
        selected--
      }
    } else {
      selected = 0
      component = undefined
      _id = undefined
      _class = undefined
    }
  }

  function select (value: DocUpdates) {
    listProvider.updateFocus(value)
    const targetClass = hierarchy.getClass(value.attachedToClass)
    const panelComponent = hierarchy.as(targetClass, view.mixin.ObjectPanel)
    component = panelComponent.component ?? view.component.EditDoc
    _id = value.attachedTo
    _class = value.attachedToClass
  }

  let component: AnyComponent | undefined
  let _id: Ref<Doc> | undefined
  let _class: Ref<Class<Doc>> | undefined

  let viewlets: Map<ActivityKey, TxViewlet>

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      const value = selected + offset
      if (docs[value] !== undefined) {
        selected = value
        listView?.select(selected)
      }
    }
  })

  const descriptors = createQuery()
  descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map(result.map((r) => [activityKey(r.objectClass, r.txClass), r]))
  })

  let selected = 0
  let listView: ListView
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<div class="flex h-full">
  {#if visibileNav}
    <div class="antiPanel-component border-right filled indent aside inbox">
      <div class="header">
        <span class="fs-title overflow-label">
          <Label label={notification.string.Inbox} />
        </span>
      </div>
      <div class="top-divider clear-mins h-full">
        <Scroller>
          {#if loading}
            <Loading />
          {:else}
            <ListView bind:this={listView} count={docs.length} selection={selected}>
              <svelte:fragment slot="item" let:item>
                <NotificationView
                  value={docs[item]}
                  selected={selected === item}
                  {viewlets}
                  on:click={() => {
                    selected = item
                  }}
                />
              </svelte:fragment>
            </ListView>
          {/if}
        </Scroller>
      </div>
    </div>
  {/if}
  {#if component && _id && _class}
    <Component is={component} props={{ embedded: true, _id, _class }} />
  {:else}
    <div class="antiPanel-component filled w-full" />
  {/if}
</div>

<style lang="scss">
  .header {
    min-height: 3.1rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 1.5rem;
  }
  .inbox {
    min-width: 20rem;
  }
</style>
