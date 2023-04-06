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
  import { AnyComponent, Component, Label, Loading, Scroller } from '@hcengineering/ui'
  import view from '@hcengineering/view'
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
      user: getCurrentAccount()._id
    },
    (res) => {
      docs = res
      if (loading && docs.length > 0) {
        select(docs[0].attachedTo, docs[0].attachedToClass)
      }
      loading = false
    },
    {
      sort: {
        lastTxTime: -1
      }
    }
  )

  function select (objectId: Ref<Doc>, objectClass: Ref<Class<Doc>>) {
    const targetClass = hierarchy.getClass(objectClass)
    const panelComponent = hierarchy.as(targetClass, view.mixin.ObjectPanel)
    component = panelComponent.component ?? view.component.EditDoc
    _id = objectId
    _class = objectClass
  }

  function selectHandler (e: CustomEvent) {
    select(e.detail._id, e.detail._class)
  }

  let component: AnyComponent | undefined
  let _id: Ref<Doc> | undefined
  let _class: Ref<Class<Doc>> | undefined

  let viewlets: Map<ActivityKey, TxViewlet>

  const descriptors = createQuery()
  descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map(result.map((r) => [activityKey(r.objectClass, r.txClass), r]))
  })
</script>

<div class="flex h-full">
  {#if visibileNav}
    <div class="antiPanel-component border-right filled indent aside">
      <div class="header">
        <span class="fs-title overflow-label">
          <Label label={notification.string.Inbox} />
        </span>
      </div>
      <div class="top-divider">
        <Scroller>
          {#if loading}
            <Loading />
          {:else}
            {#each docs as doc}
              <NotificationView value={doc} selected={doc.attachedTo === _id} {viewlets} on:click={selectHandler} />
            {/each}
          {/if}
        </Scroller>
      </div>
    </div>
  {/if}
  {#if loading}
    <Loading />
  {:else if component && _id && _class}
    <Component is={component} props={{ embedded: true, _id, _class }} />
  {/if}
</div>

<style lang="scss">
  .header {
    min-height: 3rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 1.5rem;
  }
</style>
