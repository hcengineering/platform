<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import core, { Class, Doc, Ref } from '@anticrm/core'
  import { Panel } from '@anticrm/panel'
  import { createQuery, getAttributePresenterClass, getClient } from '@anticrm/presentation'
  import type { Task } from '@anticrm/task'
  import { AnyComponent, Component } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import task from '../plugin'
  import TaskHeader from './TaskHeader.svelte'
  import { Asset } from '@anticrm/platform'

  export let _id: Ref<Task>
  let object: Task
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const docKeys: Set<string> = new Set<string>(hierarchy.getAllAttributes(core.class.AttachedDoc).keys())

  let keys: string[] = []
  let collectionKeys: string[] = []

  const query = createQuery()
  $: _id &&
    query.query(task.class.Task, { _id }, (result) => {
      object = result[0]
    })

  const dispatch = createEventDispatcher()

  function getFiltredKeys (ignoreKeys: string[]): string[] {
    let keys = [...hierarchy.getAllAttributes(object._class).entries()]
      .filter(([, value]) => value.hidden !== true)
      .map(([key]) => key)
    keys = keys.filter((k) => !docKeys.has(k))
    keys = keys.filter((k) => !ignoreKeys.includes(k))
    return keys
  }

  function getKeys (ignoreKeys: string[]): void {
    const filtredKeys = getFiltredKeys(ignoreKeys)
    keys = collectionsFilter(filtredKeys, false)
    collectionKeys = collectionsFilter(filtredKeys, true)
  }

  function collectionsFilter (keys: string[], get: boolean): string[] {
    const result: string[] = []
    for (const key of keys) {
      if (isCollectionAttr(key) === get) result.push(key)
    }
    return result
  }

  function isCollectionAttr (key: string): boolean {
    const attribute = hierarchy.getAttribute(object._class, key)
    return hierarchy.isDerived(attribute.type._class, core.class.Collection)
  }

  async function getEditor (_class: Ref<Class<Doc>>): Promise<AnyComponent> {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditor(clazz.extends)
    return editorMixin.editor
  }

  async function getCollectionEditor (key: string): Promise<AnyComponent> {
    const attribute = hierarchy.getAttribute(object._class, key)
    const attrClass = getAttributePresenterClass(attribute)
    const clazz = client.getHierarchy().getClass(attrClass)
    const editorMixin = client.getHierarchy().as(clazz, view.mixin.AttributeEditor)
    return editorMixin.editor
  }

  $: icon = object && (hierarchy.getClass(object._class).icon as Asset)
  $: title = object && hierarchy.getClass(object._class).label
</script>

{#if object !== undefined}
  <Panel
    {icon}
    {title}
    {object}
    on:close={() => {
      dispatch('close')
    }}
  >
    <TaskHeader {object} {keys} slot="subtitle" />

    {#await getEditor(object._class) then is}
      <Component
        {is}
        props={{ object }}
        on:open={(ev) => {
          getKeys(ev.detail.ignoreKeys)
        }}
      />
    {/await}
    {#each collectionKeys as collection}
      <div class="mt-14">
        {#await getCollectionEditor(collection) then is}
          <Component {is} props={{ objectId: object._id, _class: object._class, space: object.space }} />
        {/await}
      </div>
    {/each}
  </Panel>
{/if}
