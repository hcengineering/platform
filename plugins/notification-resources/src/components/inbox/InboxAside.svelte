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
  import { createEventDispatcher } from 'svelte'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component, getLocation, IconClose, location as locationStore, Spinner } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import chunter from '@hcengineering/chunter'
  import { buildRemovedDoc, checkIsObjectRemoved } from '@hcengineering/view-resources'
  import { DocNotifyContext } from '@hcengineering/notification'
  import { ActivityScrolledView } from '@hcengineering/activity-resources'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'

  export let _id: Ref<ActivityMessage>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  const inboxClient = InboxNotificationsClientImpl.getClient()

  const selectedMessageQuery = createQuery()
  const objectQuery = createQuery()

  let loc = getLocation()
  let selectedMessage: ActivityMessage | undefined = undefined
  let object: Doc | undefined = undefined
  let isLoading: boolean = true
  let notifyContext: DocNotifyContext | undefined = undefined

  locationStore.subscribe((newLocation) => {
    loc = newLocation
  })

  $: docNotifyContextByDocStore = inboxClient.docNotifyContextByDoc

  $: selectedMessageQuery.query(
    activity.class.ActivityMessage,
    { _id },
    (result: ActivityMessage[]) => {
      selectedMessage = result[0]
      notifyContext = $docNotifyContextByDocStore.get(selectedMessage.attachedTo)
    },
    {
      limit: 1
    }
  )

  async function loadObject (_id: Ref<Doc>, _class: Ref<Class<Doc>>) {
    const isRemoved = await checkIsObjectRemoved(client, _id, _class)

    if (isRemoved) {
      object = await buildRemovedDoc(client, _id, _class)
    } else {
      objectQuery.query(_class, { _id }, (res) => {
        object = res[0]
      })
    }
  }

  $: selectedMessage && loadObject(selectedMessage.attachedTo, selectedMessage.attachedToClass)

  $: objectPresenter =
    selectedMessage && hierarchy.classHierarchyMixin(selectedMessage.attachedToClass, view.mixin.ObjectPresenter)

  $: isThread = loc.query?.thread === 'true'
  $: threadId =
    selectedMessage?._class === chunter.class.ThreadMessage ? selectedMessage.attachedTo : selectedMessage?._id
</script>

{#if isThread && selectedMessage}
  <Component
    is={chunter.component.ThreadView}
    props={{ _id: threadId, selectedMessageId: selectedMessage._id }}
    on:close={() => dispatch('close')}
  />
{:else}
  <div class="ac-header full divide caption-height withoutBackground">
    <div class="ac-header__wrap-title mr-3">
      {#if objectPresenter && object}
        <Component is={objectPresenter.presenter} props={{ value: object }} />
      {/if}
    </div>

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="tool" on:click={() => dispatch('close')}>
      <IconClose size="medium" />
    </div>
  </div>

  {#if isLoading}
    <div class="spinner">
      <Spinner size="small" />
    </div>
  {/if}

  {#if object}
    <ActivityScrolledView
      bind:isLoading
      selectedMessageId={_id}
      {object}
      lastViewedTimestamp={notifyContext?.lastViewedTimestamp}
      _class={hierarchy.isDerived(object._class, chunter.class.ChunterSpace)
        ? chunter.class.ChatMessage
        : activity.class.ActivityMessage}
      skipLabels={hierarchy.isDerived(object._class, chunter.class.ChunterSpace)}
    />
  {/if}
{/if}

<style lang="scss">
  .spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .tool {
    margin-left: 0.75rem;
    opacity: 0.4;
    cursor: pointer;

    &:hover {
      opacity: 1;
    }
  }
</style>
