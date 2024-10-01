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
  import core, { Class, Doc, groupByArray, reduceCalls, Ref, Space } from '@hcengineering/core'
  import { DocNotifyContext } from '@hcengineering/notification'
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
    count: number
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextsStore = inboxClient.contexts
  const contextByDocStore = inboxClient.contextByDoc
  const objectsQueryByClass = new Map<Ref<Class<Doc>>, { query: LiveQuery, limit: number }>()

  let contexts: DocNotifyContext[] = []
  let objectsByClass = new Map<Ref<Class<Doc>>, { docs: Doc[], total: number }>()

  let shouldPushObject = false

  let sections: Section[] = []

  $: contexts = $contextsStore.filter((it) => {
    const { objectClass, isPinned, hidden } = it
    if (hidden) return false
    if (model.isPinned !== isPinned) return false
    if (model._class !== undefined && model._class !== objectClass) return false
    if (model.skipClasses !== undefined && model.skipClasses.includes(objectClass)) return false
    if (hierarchy.classHierarchyMixin(objectClass, activity.mixin.ActivityDoc) === undefined) return false
    return true
  })

  $: loadObjects(contexts)

  $: pushObj = shouldPushObject ? object : undefined

  const getPushObj = () => pushObj as Doc

  $: void getSections(objectsByClass, model, pushObj, getPushObj, (res) => {
    sections = res
  })

  $: shouldPushObject =
    object !== undefined &&
    getObjectGroup(object) === model.id &&
    (!$contextByDocStore.has(object._id) || isArchived(object))

  function isArchived (object: Doc): boolean {
    return hierarchy.isDerived(object._class, core.class.Space) ? (object as Space).archived : false
  }

  function loadObjects (contexts: DocNotifyContext[]): void {
    const contextsByClass = groupByArray(contexts, ({ objectClass }) => objectClass)

    for (const [_class, ctx] of contextsByClass.entries()) {
      const isSpace = hierarchy.isDerived(_class, core.class.Space)
      const ids = ctx.map(({ objectId }) => objectId)
      const { query, limit } = objectsQueryByClass.get(_class) ?? {
        query: createQuery(),
        limit: isSpace ? -1 : model.maxSectionItems ?? 5
      }

      objectsQueryByClass.set(_class, { query, limit: limit ?? model.maxSectionItems ?? 5 })

      query.query(
        _class,
        {
          _id: { $in: limit !== -1 ? ids.slice(0, limit) : ids },
          ...(isSpace ? { space: core.space.Space, archived: false } : {})
        },
        (res) => {
          objectsByClass = objectsByClass.set(_class, { docs: res, total: res.total })
        },
        { total: true }
      )
    }

    for (const [classRef, query] of objectsQueryByClass.entries()) {
      if (!contextsByClass.has(classRef)) {
        query.query.unsubscribe()
        objectsQueryByClass.delete(classRef)
        objectsByClass.delete(classRef)
      }
    }
    objectsByClass = objectsByClass
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
      objectsByClass: Map<Ref<Class<Doc>>, { docs: Doc[], total: number }>,
      model: ChatNavGroupModel,
      object: { _id: Doc['_id'], _class: Doc['_class'] } | undefined,
      getPushObj: () => Doc,
      handler: (result: Section[]) => void
    ): Promise<void> => {
      const result: Section[] = []

      if (!model.wrap) {
        result.push({
          id: model.id,
          objects: Array.from(Array.from(objectsByClass.values()).map((it) => it.docs)).flat(),
          label: model.label ?? chunter.string.Channels,
          count: Array.from(Array.from(objectsByClass.values()).map((it) => it.total)).reduceRight((a, b) => a + b, 0)
        })

        handler(result)
        return
      }

      let isObjectPushed = false

      if (
        Array.from(Array.from(objectsByClass.values()).map((it) => it.docs))
          .flat()
          .some((o) => o._id === object?._id)
      ) {
        isObjectPushed = true
      }

      for (let [_class, { docs: objects, total }] of objectsByClass.entries()) {
        const clazz = hierarchy.getClass(_class)
        const sectionObjects = [...objects]

        if (object !== undefined && _class === object._class && !objects.some(({ _id }) => _id === object._id)) {
          isObjectPushed = true
          sectionObjects.push(getPushObj())
          total++
        }

        result.push({
          id: _class,
          _class,
          objects: sectionObjects,
          label: clazz.pluralLabel ?? clazz.label,
          count: total
        })
      }

      if (!isObjectPushed && object !== undefined) {
        const clazz = hierarchy.getClass(object._class)

        result.push({
          id: object._id,
          _class: object._class,
          objects: [getPushObj()],
          label: clazz.pluralLabel ?? clazz.label,
          count: 1
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
      return model.getActionsFn(contexts.filter(({ objectClass }) => objectClass === _class))
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
    itemsCount={section.count}
    on:show-more={() => {
      if (section._class !== undefined) {
        const query = objectsQueryByClass.get(section._class)
        if (query !== undefined) {
          query.limit += 50
          loadObjects(contexts)
        }
      }
    }}
    on:select
  />
{/each}
