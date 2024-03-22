<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
    ActivityMessagePreviewType,
    DisplayDocUpdateMessage,
    DocUpdateMessageViewlet
  } from '@hcengineering/activity'
  import { Action, Component } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { IntlString } from '@hcengineering/platform'
  import { AttachedDoc, Collection, Doc } from '@hcengineering/core'
  import { AttributeModel } from '@hcengineering/view'

  import { getAttributeModel, getCollectionAttribute } from '../../activityMessagesUtils'
  import BaseMessagePreview from '../activity-message/BaseMessagePreview.svelte'
  import DocUpdateMessageContent from './DocUpdateMessageContent.svelte'
  import DocUpdateMessageAttributes from './DocUpdateMessageAttributes.svelte'
  import { createEventDispatcher } from 'svelte'

  export let value: DisplayDocUpdateMessage
  export let readonly = false
  export let type: ActivityMessagePreviewType = 'full'
  export let actions: Action[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let viewlet: DocUpdateMessageViewlet | undefined
  let objectName: IntlString | undefined = undefined
  let collectionName: IntlString | undefined = undefined

  let attributeModel: AttributeModel | undefined = undefined
  let object: Doc | undefined

  $: [viewlet] = client
    .getModel()
    .findAllSync(activity.class.DocUpdateMessageViewlet, { action: value.action, objectClass: value.objectClass })

  $: collectionAttribute = getCollectionAttribute(hierarchy, value.attachedToClass, value.updateCollection)
  $: clazz = hierarchy.getClass(value.objectClass)

  $: objectName = (collectionAttribute?.type as Collection<AttachedDoc>)?.itemLabel ?? clazz.label
  $: collectionName = collectionAttribute?.label

  $: void getAttributeModel(client, value.attributeUpdates, value.objectClass).then((model) => {
    attributeModel = model
  })

  function onClick (event: MouseEvent): void {
    event.stopPropagation()
    event.preventDefault()
    dispatch('click')
  }
</script>

<BaseMessagePreview message={value} {type} {readonly} {actions} on:click>
  <span class="textContent overflow-label" class:contentOnly={type === 'content-only'}>
    {#if viewlet?.component && object}
      <div class="customContent">
        {#each value?.previousMessages ?? [] as msg}
          <Component
            is={viewlet.component}
            props={{ message: msg, _id: msg.objectId, _class: msg.objectClass, preview: true, onClick }}
          />
        {/each}
        <Component
          is={viewlet.component}
          props={{
            message: value,
            _id: value.objectId,
            _class: value.objectClass,
            preview: true,
            value: object,
            onClick
          }}
        />
      </div>
    {:else if value.action === 'create' || value.action === 'remove'}
      <DocUpdateMessageContent
        message={value}
        {viewlet}
        {objectName}
        {collectionName}
        objectIcon={collectionAttribute?.icon ?? clazz.icon}
        preview
      />
    {:else if value.attributeUpdates && attributeModel}
      <DocUpdateMessageAttributes attributeUpdates={value.attributeUpdates} {attributeModel} {viewlet} preview />
    {/if}
  </span>
</BaseMessagePreview>

<style lang="scss">
  .textContent {
    display: inline;
    overflow: hidden;
    max-height: 1.25rem;
    color: var(--global-primary-TextColor);
    margin-left: var(--spacing-0_5);

    &.contentOnly {
      margin-left: 0;
    }
  }
</style>
