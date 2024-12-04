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
  import activity, {
    ActivityMessage,
    ActivityMessageViewType,
    DisplayActivityMessage,
    DisplayDocUpdateMessage,
    DocUpdateMessage,
    DocUpdateMessageViewlet
  } from '@hcengineering/activity'
  import { personByPersonIdStore } from '@hcengineering/contact-resources'
  import { AttachedDoc, Class, Collection, Doc, Ref, Space } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Action, Component, ShowMore } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import { buildRemovedDoc, checkIsObjectRemoved } from '@hcengineering/view-resources'

  import ActivityMessageTemplate from '../activity-message/ActivityMessageTemplate.svelte'
  import DocUpdateMessageAttributes from './DocUpdateMessageAttributes.svelte'
  import DocUpdateMessageContent from './DocUpdateMessageContent.svelte'
  import DocUpdateMessageHeader from './DocUpdateMessageHeader.svelte'

  import { getAttributeModel, getCollectionAttribute } from '../../activityMessagesUtils'
  import { getIsTextType } from '../../utils'

  export let value: DisplayDocUpdateMessage
  export let doc: Doc | undefined = undefined
  export let showNotify: boolean = false
  export let isHighlighted: boolean = false
  export let isSelected: boolean = false
  export let shouldScroll: boolean = false
  export let embedded: boolean = false
  export let withActions: boolean = true
  export let showEmbedded = false
  export let hideFooter = false
  export let actions: Action[] = []
  export let skipLabel = false
  export let hoverable = true
  export let hoverStyles: 'borderedHover' | 'filledHover' = 'borderedHover'
  export let hideLink = false
  export let type: ActivityMessageViewType = 'default'
  export let readonly = false
  export let space: Ref<Space> | undefined = undefined
  export let onClick: (() => void) | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const objectQuery = createQuery()
  const parentObjectQuery = createQuery()

  let objectName: IntlString | undefined = undefined
  let collectionName: IntlString | undefined = undefined

  $: collectionAttribute = getCollectionAttribute(hierarchy, value.attachedToClass, value.updateCollection)
  $: clazz = hierarchy.getClass(value.objectClass)

  $: objectName = (collectionAttribute?.type as Collection<AttachedDoc>)?.itemLabel ?? clazz.label
  $: collectionName = collectionAttribute?.label

  let viewlet: DocUpdateMessageViewlet | undefined
  let attributeModel: AttributeModel | undefined = undefined
  let parentMessage: DisplayActivityMessage | undefined = undefined
  let parentObject: Doc | undefined
  let object: Doc | undefined
  let isObjectRemoved: boolean = false

  $: [viewlet] = client
    .getModel()
    .findAllSync(activity.class.DocUpdateMessageViewlet, { action: value.action, objectClass: value.objectClass })

  $: void getAttributeModel(client, value.attributeUpdates, value.objectClass).then((model) => {
    attributeModel = model
  })

  async function getParentMessage (
    _class: Ref<Class<Doc>>,
    _id: Ref<Doc>,
    space: Ref<Space>
  ): Promise<ActivityMessage | undefined> {
    if (hierarchy.isDerived(_class, activity.class.ActivityMessage)) {
      return await client.findOne(activity.class.ActivityMessage, { _id: _id as Ref<ActivityMessage>, space })
    }
  }

  $: void getParentMessage(value.attachedToClass, value.attachedTo, value.space).then((res) => {
    parentMessage = res as DisplayActivityMessage
  })

  $: person = account !== undefined ? $personByPersonIdStore.get(value.createdBy) : undefined

  $: void loadObject(value.objectId, value.objectClass, doc)
  $: void loadParentObject(value, parentMessage, doc)

  async function loadObject (_id: Ref<Doc>, _class: Ref<Class<Doc>>, doc?: Doc): Promise<void> {
    if (doc !== undefined && doc._id === _id) {
      object = doc
      isObjectRemoved = false
      return
    }

    isObjectRemoved = await checkIsObjectRemoved(client, _id, _class)

    if (isObjectRemoved) {
      object = await buildRemovedDoc(client, _id, _class)
    } else {
      objectQuery.query(_class, { _id }, (res) => {
        object = res[0]
      })
    }
  }

  async function loadParentObject (
    message: Pick<DocUpdateMessage, 'attachedTo' | 'attachedToClass' | 'objectId' | 'space'>,
    parentMessage?: Pick<ActivityMessage, 'attachedTo' | 'space' | 'attachedToClass'>,
    doc?: Doc
  ): Promise<void> {
    if (parentMessage === undefined && message.objectId === message.attachedTo) {
      return
    }

    const _id = parentMessage !== undefined ? parentMessage.attachedTo : message.attachedTo
    const _class = parentMessage !== undefined ? parentMessage.attachedToClass : message.attachedToClass
    const space = parentMessage !== undefined ? parentMessage.space : message.space

    if (doc !== undefined && doc._id === _id) {
      parentObject = doc
      return
    }

    const isRemoved = await checkIsObjectRemoved(client, _id, _class)

    if (isRemoved) {
      parentObject = await buildRemovedDoc(client, _id, _class)
      return
    }

    parentObjectQuery.query(_class, { _id, space }, (res) => {
      parentObject = res[0]
    })
  }

  $: if (object != null && value.objectClass !== object._class) {
    object = undefined
  }
</script>

<ActivityMessageTemplate
  message={value}
  {parentMessage}
  {person}
  {showNotify}
  {isHighlighted}
  {isSelected}
  {shouldScroll}
  {embedded}
  {withActions}
  {viewlet}
  {showEmbedded}
  {hideFooter}
  {actions}
  {skipLabel}
  {hoverable}
  {hoverStyles}
  {readonly}
  type={viewlet?.label || getIsTextType(attributeModel) ? 'default' : type}
  showDatePreposition={hideLink}
  {onClick}
>
  <svelte:fragment slot="header">
    <DocUpdateMessageHeader message={value} {object} {parentObject} {viewlet} {person} {attributeModel} {hideLink} />
  </svelte:fragment>
  <svelte:fragment slot="content">
    {#if viewlet?.component && object}
      <ShowMore>
        <div class="customContent">
          {#each value?.previousMessages ?? [] as msg}
            <Component
              is={viewlet.component}
              props={{ message: msg, _id: msg.objectId, _class: msg.objectClass, onClick }}
            />
          {/each}
          <Component
            is={viewlet.component}
            props={{ message: value, _id: value.objectId, _class: value.objectClass, value: object, onClick }}
          />
        </div>
      </ShowMore>
    {:else if value.action === 'create' || value.action === 'remove'}
      <ShowMore>
        <DocUpdateMessageContent
          message={value}
          {viewlet}
          {objectName}
          {collectionName}
          objectIcon={collectionAttribute?.icon ?? clazz.icon}
        />
      </ShowMore>
    {:else if value.attributeUpdates && attributeModel}
      <DocUpdateMessageAttributes
        attributeUpdates={value.attributeUpdates}
        {attributeModel}
        {viewlet}
        {space}
        {object}
        message={value}
      />
    {/if}
  </svelte:fragment>
</ActivityMessageTemplate>

<style lang="scss">
  .customContent {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.625rem;
    row-gap: 0.625rem;
  }
</style>
