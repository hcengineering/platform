<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import contact, { formatName } from '@anticrm/contact'
  import { Class, ClassifierKind, Doc, Mixin, Obj, Ref } from '@anticrm/core'
  import notification from '@anticrm/notification'
  import { Panel } from '@anticrm/panel'
  import { Asset, getResource, translate } from '@anticrm/platform'
  import {
    AttributesBar,
    createQuery,
    getAttributePresenterClass,
    getClient,
    KeyedAttribute
  } from '@anticrm/presentation'
  import { AnyComponent, Component } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { collectionsFilter, getCollectionCounter, getFiltredKeys } from '../utils'
  import ActionContext from './ActionContext.svelte'
  import DocAttributeBar from './DocAttributeBar.svelte'
  import UpDownNavigator from './UpDownNavigator.svelte'

  export let _id: Ref<Doc>
  export let _class: Ref<Class<Doc>>

  let realObjectClass: Ref<Class<Doc>> = _class
  let lastId: Ref<Doc> = _id
  let lastClass: Ref<Class<Doc>> = _class
  let object: Doc
  let parentClass: Ref<Class<Doc>>

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  $: read(_id)
  function read (_id: Ref<Doc>) {
    if (lastId !== _id) {
      const prev = lastId
      const prevClass = lastClass
      lastId = _id
      lastClass = _class
      notificationClient.then((client) => client.updateLastView(prev, prevClass))
    }
  }

  onDestroy(async () => {
    notificationClient.then((client) => client.updateLastView(_id, _class))
  })

  const query = createQuery()
  $: _id &&
    _class &&
    query.query(_class, { _id }, (result) => {
      object = result[0]
      realObjectClass = object._class
    })

  let keys: KeyedAttribute[] = []
  let collectionEditors: { key: KeyedAttribute; editor: AnyComponent }[] = []

  let mixins: Mixin<Doc>[] = []

  const dispatch = createEventDispatcher()

  function getMixins (): void {
    const descendants = hierarchy.getDescendants(parentClass).map((p) => hierarchy.getClass(p))
    mixins = descendants.filter(
      (m) => m.kind === ClassifierKind.MIXIN && hierarchy.hasMixin(object, m._id) && !ignoreMixins.has(m._id)
    )
  }

  let ignoreKeys: string[] = []
  let ignoreMixins: Set<Ref<Mixin<Doc>>> = new Set<Ref<Mixin<Doc>>>()

  async function updateKeys (): Promise<void> {
    const keysMap = new Map(getFiltredKeys(hierarchy, object._class, ignoreKeys).map((p) => [p.attr._id, p]))
    for (const m of mixins) {
      const mkeys = getFiltredKeys(hierarchy, m._id, ignoreKeys)
      for (const key of mkeys) {
        keysMap.set(key.attr._id, key)
      }
    }
    const filtredKeys = Array.from(keysMap.values())
    keys = collectionsFilter(hierarchy, filtredKeys, false)

    const collectionKeys = collectionsFilter(hierarchy, filtredKeys, true)
    const editors: { key: KeyedAttribute; editor: AnyComponent }[] = []
    for (const k of collectionKeys) {
      const editor = await getCollectionEditor(k)
      editors.push({ key: k, editor })
    }
    collectionEditors = editors
  }

  async function getEditor (_class: Ref<Class<Doc>>): Promise<AnyComponent> {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditor(clazz.extends)
    return editorMixin.editor
  }

  let mainEditor: AnyComponent | undefined
  $: getEditorOrDefault(realObjectClass)

  async function getEditorOrDefault (_class: Ref<Class<Doc>>): Promise<void> {
    parentClass = getParentClass(_class)
    mainEditor = await getEditor(_class)
  }

  async function getCollectionEditor (key: KeyedAttribute): Promise<AnyComponent> {
    const attrClass = getAttributePresenterClass(key.attr)
    const clazz = hierarchy.getClass(attrClass)
    const editorMixin = hierarchy.as(clazz, view.mixin.CollectionEditor)
    return editorMixin.editor
  }

  function getIcon (_class: Ref<Class<Obj>> | undefined): Asset | undefined {
    if (_class === undefined) return undefined
    let clazz = hierarchy.getClass(_class)
    if (clazz.icon !== undefined) return clazz.icon
    while (clazz.extends !== undefined) {
      clazz = hierarchy.getClass(clazz.extends)
      if (clazz.icon !== undefined) {
        return clazz.icon
      }
    }
    throw new Error(`Icon not found for ${_class}`)
  }

  $: icon = getIcon(realObjectClass)

  function getParentClass (_class: Ref<Class<Doc>>): Ref<Class<Doc>> {
    const baseDomain = hierarchy.getDomain(_class)
    const ancestors = hierarchy.getAncestors(_class)
    let result: Ref<Class<Doc>> = _class
    for (const ancestor of ancestors) {
      try {
        const domain = hierarchy.getClass(ancestor).domain
        if (domain === baseDomain) {
          result = ancestor
        }
      } catch {}
    }
    return result
  }

  let title: string = ''

  $: if (object !== undefined) {
    getTitle(object).then((t) => {
      title = t
    })
  }

  async function getTitle (object: Doc): Promise<string> {
    const name = (object as any).name
    if (name !== undefined) {
      if (hierarchy.isDerived(object._class, contact.class.Person)) {
        return formatName(name)
      }
      return name
    }
    const label = hierarchy.getClass(object._class).label
    return await translate(label, {})
  }

  async function getHeaderEditor (_class: Ref<Class<Doc>>): Promise<AnyComponent | undefined> {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditorHeader)
    if (editorMixin.editor != null) return editorMixin.editor
    if (clazz.extends != null) return getHeaderEditor(clazz.extends)
  }

  let headerEditor: AnyComponent | undefined = undefined
  let headerLoading = false
  $: {
    headerLoading = true
    getHeaderEditor(realObjectClass).then((r) => {
      headerEditor = r
      headerLoading = false
    })
  }

  const _update = (result: any): void => {
    dispatch('update', result)
  }
  let panelWidth: number = 0
  let innerWidth: number = 0
</script>

<ActionContext
  context={{
    mode: 'editor'
  }}
/>

{#if object !== undefined && title !== undefined}
  <Panel
    {icon}
    {title}
    {object}
    isHeader={false}
    isAside={true}
    bind:panelWidth
    bind:innerWidth
    isFullSize
    on:fullsize
    on:update={(ev) => _update(ev.detail)}
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="navigator">
      <UpDownNavigator element={object} />
    </svelte:fragment>

    <svelte:fragment slot="attributes" let:direction={dir}>
      {#if !headerLoading}
        {#if headerEditor !== undefined}
          <Component
            is={headerEditor}
            props={{ object, keys, mixins, ignoreKeys, vertical: dir === 'column' }}
            on:update={updateKeys}
          />
        {:else if dir === 'column'}
          <DocAttributeBar {object} {mixins} {ignoreKeys} on:update={updateKeys} />
        {:else}
          <AttributesBar {object} _class={realObjectClass} {keys} />
        {/if}
      {/if}
    </svelte:fragment>

    {#if mainEditor}
      <Component
        is={mainEditor}
        props={{ object }}
        on:open={(ev) => {
          ignoreKeys = ev.detail.ignoreKeys
          ignoreMixins = new Set(ev.detail.ignoreMixins)
          getMixins()
          updateKeys()
        }}
      />
    {/if}
    {#each collectionEditors as collection}
      {#if collection.editor}
        <div class="mt-6">
          <Component
            is={collection.editor}
            props={{
              objectId: object._id,
              _class: collection.key.attr.attributeOf,
              object,
              space: object.space,
              key: collection.key,
              [collection.key.key]: getCollectionCounter(hierarchy, object, collection.key)
            }}
          />
        </div>
      {/if}
    {/each}
  </Panel>
{/if}
