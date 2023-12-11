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
  import { Person, PersonAccount } from '@hcengineering/contact'
  import { personByIdStore } from '@hcengineering/contact-resources'
  import { Account, AttachedDoc, Class, Collection, Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import notification, {
    ActivityMessage,
    DocUpdateMessageViewlet,
    DocUpdateMessage,
    DisplayDocUpdateMessage,
    DisplayActivityMessage,
    DocUpdateAction
  } from '@hcengineering/notification'
  import core from '@hcengineering/core/lib/component'
  import { AttributeModel } from '@hcengineering/view'
  import { IntlString } from '@hcengineering/platform'
  import { Component, ShowMore } from '@hcengineering/ui'

  import ActivityMessageTemplate from '../activity-message/ActivityMessageTemplate.svelte'
  import DocUpdateMessageHeader from './DocUpdateMessageHeader.svelte'
  import DocUpdateMessageContent from './DocUpdateMessageContent.svelte'
  import DocUpdateMessageAttributes from './DocUpdateMessageAttributes.svelte'

  import { getAttributeModel, getCollectionAttribute, getNotificationObject } from '../../activityMessagesUtils'

  export let value: DisplayDocUpdateMessage
  export let hasNotifyActions = false
  export let showNotify: boolean = false
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let embedded: boolean = false
  export let hasActionsMenu: boolean = true
  export let onClick: (() => void) | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const viewletQuery = createQuery()
  const userQuery = createQuery()

  const collectionAttribute = getCollectionAttribute(hierarchy, value.attachedToClass, value.updateCollection)
  const clazz = hierarchy.getClass(value.objectClass)
  const objectName: IntlString | undefined =
    (collectionAttribute?.type as Collection<AttachedDoc>)?.itemLabel || clazz.label
  const collectionName = collectionAttribute?.label

  let user: PersonAccount | undefined = undefined
  let person: Person | undefined = undefined
  let viewlet: DocUpdateMessageViewlet | undefined
  let attributeModel: AttributeModel | undefined = undefined
  let parentMessage: DisplayActivityMessage | undefined = undefined
  let parentObject: Doc | undefined
  let object: Doc | undefined
  let isObjectRemoved: boolean = false

  let isViewletLoading = true
  let isObjectLoading = true

  $: isLoading = isViewletLoading || isObjectLoading

  $: loadViewlet(value.action, value.objectClass)

  async function loadViewlet (action: DocUpdateAction, objectClass: Ref<Class<Doc>>) {
    isViewletLoading = true

    const res = viewletQuery.query(
      notification.class.DocUpdateMessageViewlet,
      { action, objectClass },
      (result: DocUpdateMessageViewlet[]) => {
        viewlet = result[0]
        isViewletLoading = false
      }
    )

    if (!res) {
      isViewletLoading = false
    }
  }

  $: getAttributeModel(client, value.attributeUpdates, value.attachedToClass).then((model) => {
    attributeModel = model
  })

  async function getParentMessage (_class: Ref<Class<Doc>>, _id: Ref<Doc>): Promise<ActivityMessage | undefined> {
    if (hierarchy.isDerived(_class, notification.class.ActivityMessage)) {
      return await client.findOne(notification.class.ActivityMessage, { _id: _id as Ref<ActivityMessage> })
    }
  }

  $: getParentMessage(value.attachedToClass, value.attachedTo).then((res) => {
    parentMessage = res as DisplayActivityMessage
  })

  $: userQuery.query(core.class.Account, { _id: value.createdBy }, (res: Account[]) => {
    user = res[0] as PersonAccount
  })

  $: person = user?.person && $personByIdStore.get(user.person)

  $: getNotificationObject(client, value.objectId, value.objectClass).then((result) => {
    isObjectLoading = false
    object = result.object
    isObjectRemoved = result.isRemoved
  })

  $: getParentObject(value, parentMessage).then((result) => {
    parentObject = result?.object
  })

  async function getParentObject (message: DocUpdateMessage, parentMessage?: ActivityMessage) {
    if (parentMessage) {
      return await getNotificationObject(client, parentMessage.attachedTo, parentMessage.attachedToClass)
    }

    if (message.objectId === message.attachedTo) {
      return
    }

    return await getNotificationObject(client, message.attachedTo, message.attachedToClass)
  }

  $: if (object && value.objectClass !== object._class) {
    object = undefined
  }
</script>

{#if !isLoading && (!viewlet?.hideIfRemoved || !isObjectRemoved) && (value.action !== 'update' || attributeModel !== undefined)}
  <ActivityMessageTemplate
    message={value}
    {parentMessage}
    {person}
    {showNotify}
    {isHighlighted}
    {isSelected}
    {shouldScroll}
    {embedded}
    {hasActionsMenu}
    {viewlet}
    {hasNotifyActions}
    {onClick}
  >
    <svelte:fragment slot="header">
      {#if viewlet?.labelComponent}
        <Component is={viewlet.labelComponent} props={{ value: object }} />
      {:else}
        <DocUpdateMessageHeader
          message={value}
          {object}
          {parentObject}
          {viewlet}
          {person}
          {objectName}
          {collectionName}
          {attributeModel}
        />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="content">
      {#if viewlet?.component}
        <ShowMore>
          <div class="customContent">
            {#each [...(value?.previousMessages ?? []), value] as msg}
              {#await getNotificationObject(client, msg.objectId, msg.objectClass) then { object }}
                {#if object}
                  <Component is={viewlet.component} props={{ message: value, value: object }} />
                {/if}
              {/await}
            {/each}
          </div>
        </ShowMore>
      {:else if value.action === 'create' || value.action === 'remove'}
        <ShowMore>
          <DocUpdateMessageContent
            objectClass={value.objectClass}
            message={value}
            {viewlet}
            {objectName}
            {collectionName}
            {collectionAttribute}
          />
        </ShowMore>
      {:else if value.attributeUpdates && attributeModel}
        <DocUpdateMessageAttributes attributeUpdates={value.attributeUpdates} {attributeModel} {viewlet} />
      {/if}
    </svelte:fragment>
  </ActivityMessageTemplate>
{/if}

<style lang="scss">
  .customContent {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.625rem;
    row-gap: 0.625rem;
  }
</style>
