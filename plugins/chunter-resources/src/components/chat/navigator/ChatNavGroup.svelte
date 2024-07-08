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
  import activity from '@hcengineering/activity'
  import { Class, Doc, getCurrentAccount, groupByArray, reduceCalls, Ref, SortingOrder } from '@hcengineering/core'
  import notification, { DocNotifyContext } from '@hcengineering/notification'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient, LiveQuery } from '@hcengineering/presentation'
  import { Action } from '@hcengineering/ui'

  import chunter from '../../../plugin'
  import { ChatGroup, ChatNavGroupModel } from '../types'
  import ChatNavSection from './ChatNavSection.svelte'

  export let object: Doc | undefined
  export let model: ChatNavGroupModel

  interface Section {
    id: string
    _class?: Ref<Class<Doc>>
    label: IntlString
    objects: Doc[]
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = inboxClient.contextByDoc

  const contextsQuery = createQuery()
  const objectsQueryByClass = new Map<Ref<Class<Doc>>, LiveQuery>()

  let objectsByClass = new Map<Ref<Class<Doc>>, Doc[]>()
  let contexts: DocNotifyContext[] = []

  let shouldPushObject = false

  let sections: Section[] = []

  $: contextsQuery.query(
    notification.class.DocNotifyContext,
    {
      ...model.query,
      hidden: false,
      user: getCurrentAccount()._id
    },
    (res: DocNotifyContext[]) => {
      contexts = res.filter(
        ({ attachedToClass }) =>
          hierarchy.classHierarchyMixin(attachedToClass, activity.mixin.ActivityDoc) !== undefined
      )
    },
    { sort: { createdOn: SortingOrder.Ascending } }
  )

  $: loadObjects(contexts)

  $: pushObj = shouldPushObject ? object : undefined

  const getPushObj = () => pushObj as Doc

  $: void getSections(objectsByClass, model, pushObj, getPushObj, (res) => {
    sections = res
  })

  $: shouldPushObject =
    object !== undefined && getObjectGroup(object) === model.id && !$contextByDocStore.has(object._id)

  function loadObjects (contexts: DocNotifyContext[]): void {
    const contextsByClass = groupByArray(contexts, ({ attachedToClass }) => attachedToClass)

    for (const [_class, ctx] of contextsByClass.entries()) {
      const ids = ctx.map(({ attachedTo }) => attachedTo)
      const query = objectsQueryByClass.get(_class) ?? createQuery()

      objectsQueryByClass.set(_class, query)

      query.query(_class, { _id: { $in: ids } }, (res: Doc[]) => {
        objectsByClass = objectsByClass.set(_class, res)
      })
    }

    for (const [classRef, query] of objectsQueryByClass.entries()) {
      if (!contextsByClass.has(classRef)) {
        query.unsubscribe()
        objectsQueryByClass.delete(classRef)
        objectsByClass.delete(classRef)

        objectsByClass = objectsByClass
      }
    }
  }

  function getObjectGroup (object: Doc): ChatGroup {
    if (hierarchy.isDerived(object._class, chunter.class.Channel)) {
      return 'channels'
    }

    if (hierarchy.isDerived(object._class, chunter.class.DirectMessage)) {
      return 'direct'
    }

    return 'activity'
  }

  const getSections = reduceCalls(
    async (
      objectsByClass: Map<Ref<Class<Doc>>, Doc[]>,
      model: ChatNavGroupModel,
      object: { _id: Doc['_id'], _class: Doc['_class'] } | undefined,
      getPushObj: () => Doc,
      handler: (result: Section[]) => void
    ): Promise<void> => {
      const result: Section[] = []

      if (!model.wrap) {
        result.push({
          id: model.id,
          objects: Array.from(objectsByClass.values()).flat(),
          label: model.label ?? chunter.string.Channels
        })

        handler(result)
        return
      }

      let isObjectPushed = false

      if (
        Array.from(objectsByClass.values())
          .flat()
          .some((o) => o._id === object?._id)
      ) {
        isObjectPushed = true
      }

      for (const [_class, objects] of objectsByClass.entries()) {
        const clazz = hierarchy.getClass(_class)
        const sectionObjects = [...objects]

        if (object !== undefined && _class === object._class && !objects.some(({ _id }) => _id === object._id)) {
          isObjectPushed = true
          sectionObjects.push(getPushObj())
        }

        result.push({
          id: _class,
          _class,
          objects: sectionObjects,
          label: clazz.pluralLabel ?? clazz.label
        })
      }

      if (!isObjectPushed && object !== undefined) {
        const clazz = hierarchy.getClass(object._class)

        result.push({
          id: object._id,
          _class: object._class,
          objects: [getPushObj()],
          label: clazz.pluralLabel ?? clazz.label
        })
      }

      handler(result.sort((s1, s2) => s1.label.localeCompare(s2.label)))
    }
  )

  function getSectionActions (section: Section, contexts: DocNotifyContext[]): Action[] {
    if (model.getActionsFn === undefined) {
      return []
    }

    const { _class } = section

    if (_class === undefined) {
      return model.getActionsFn(contexts)
    } else {
      return model.getActionsFn(contexts.filter(({ attachedToClass }) => attachedToClass === _class))
    }
  }
</script>

{#each sections as section (section.id)}
  <ChatNavSection
    id={section.id}
    objects={section.objects}
    {contexts}
    objectId={object?._id}
    header={section.label}
    actions={getSectionActions(section, contexts)}
    sortFn={model.sortFn}
    maxItems={model.maxSectionItems}
    on:select
  />
{/each}
