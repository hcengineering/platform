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
  import core, { Class, ClassifierKind, Doc, Hierarchy, Mixin, Obj, Ref } from '@anticrm/core'
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
  import { AnyComponent, Component, Label, PopupAlignment } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import ActionContext from './ActionContext.svelte'
  import { getCollectionCounter, getMixinStyle } from '../utils'

  export let _id: Ref<Doc>
  export let _class: Ref<Class<Doc>>
  export let rightSection: AnyComponent | undefined = undefined
  export let position: PopupAlignment | undefined = undefined

  let lastId: Ref<Doc> = _id
  let lastClass: Ref<Class<Doc>> = _class
  let object: Doc
  let objectClass: Class<Doc>
  let parentClass: Ref<Class<Doc>>
  let fullSize: boolean = true

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const notificationClient = getResource(notification.function.GetNotificationClient).then((res) => res())

  const docKeys: Set<string> = new Set<string>(hierarchy.getAllAttributes(core.class.AttachedDoc).keys())

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
    })

  $: if (object !== undefined) objectClass = hierarchy.getClass(object._class)

  let selectedClass: Ref<Class<Doc>> | undefined
  let prevSelected = selectedClass

  let keys: KeyedAttribute[] = []
  let collectionEditors: {key: KeyedAttribute, editor: AnyComponent} [] = []

  let mixins: Mixin<Doc>[] = []

  $: if (object && prevSelected !== object._class) {
    prevSelected = object._class
    selectedClass = Hierarchy.mixinOrClass(object)

    parentClass = getParentClass(object._class)
    getMixins()
  }

  const dispatch = createEventDispatcher()

  function getMixins (): void {
    const descendants = hierarchy.getDescendants(parentClass).map((p) => hierarchy.getClass(p))
    mixins = descendants.filter(
      (m) => m.kind === ClassifierKind.MIXIN && hierarchy.hasMixin(object, m._id) && !ignoreMixins.has(m._id)
    )
  }

  function filterKeys (keys: KeyedAttribute[], ignoreKeys: string[]): KeyedAttribute[] {
    keys = keys.filter((k) => !docKeys.has(k.key))
    keys = keys.filter((k) => !ignoreKeys.includes(k.key))
    return keys
  }

  function getFiltredKeys (objectClass: Ref<Class<Doc>>, ignoreKeys: string[], to?: Ref<Class<Doc>>): KeyedAttribute[] {
    const keys = [...hierarchy.getAllAttributes(objectClass, to).entries()]
      .filter(([, value]) => value.hidden !== true)
      .map(([key, attr]) => ({ key, attr }))

    return filterKeys(keys, ignoreKeys)
  }

  let ignoreKeys: string[] = []
  let ignoreMixins: Set<Ref<Mixin<Doc>>> = new Set<Ref<Mixin<Doc>>>()

  async function updateKeys (): Promise<void> {
    const filtredKeys = getFiltredKeys(
      selectedClass ?? object._class,
      ignoreKeys,
      selectedClass !== objectClass._id ? objectClass._id : undefined
    )
    keys = collectionsFilter(filtredKeys, false)

    const collectionKeys = collectionsFilter(filtredKeys, true)
    const editors: {key: KeyedAttribute, editor: AnyComponent}[] = []
    for (const k of collectionKeys) {
      const editor = await getCollectionEditor(k)
      editors.push({ key: k, editor })
    }
    collectionEditors = editors
  }

  function collectionsFilter (keys: KeyedAttribute[], get: boolean): KeyedAttribute[] {
    const result: KeyedAttribute[] = []
    for (const key of keys) {
      if (isCollectionAttr(key) === get) result.push(key)
    }
    return result
  }

  function isCollectionAttr (key: KeyedAttribute): boolean {
    return hierarchy.isDerived(key.attr.type._class, core.class.Collection)
  }

  async function getEditor (_class: Ref<Class<Doc>>): Promise<AnyComponent> {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditor(clazz.extends)
    return editorMixin.editor
  }

  let mainEditor: AnyComponent

  $: if (object) getEditorOrDefault(selectedClass, object._class)

  async function getEditorOrDefault (_class: Ref<Class<Doc>> | undefined, defaultClass: Ref<Class<Doc>>): Promise<void> {
    let editor = _class !== undefined ? await getEditor(_class) : undefined
    if (editor === undefined) {
      editor = await getEditor(defaultClass)
    }
    mainEditor = editor
    updateKeys()
    getMixins()
  }

  async function getCollectionEditor (key: KeyedAttribute): Promise<AnyComponent> {
    const attrClass = getAttributePresenterClass(key.attr)
    const clazz = client.getHierarchy().getClass(attrClass)
    const editorMixin = client.getHierarchy().as(clazz, view.mixin.AttributeEditor)
    return editorMixin.editor
  }

  function getIcon (_class: Ref<Class<Obj>>): Asset {
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

  $: icon = object && getIcon(object._class)

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
  $: if (object !== undefined) {
    headerLoading = true
    getHeaderEditor(object._class).then((r) => {
      headerEditor = r
      headerLoading = false
    })
  }
</script>
<ActionContext context={{
  mode: 'editor'
}}/>

{#if object !== undefined && title !== undefined}
  <Panel
    {icon}
    {title}
    {rightSection}
    {fullSize}
    {object}
    {position}
    on:close={() => {
      dispatch('close')
    }}
  >
    <div class="w-full" slot="subtitle">
      {#if !headerLoading}
        {#if headerEditor !== undefined}
          <Component is={headerEditor} props={{ object, keys }} />
        {:else}
          <AttributesBar {object} {keys} />
        {/if}
      {/if}
    </div>
    <div class="main-editor">
      {#if mainEditor}
        <Component
          is={mainEditor}
          props={{ object }}
          on:open={(ev) => {
            ignoreKeys = ev.detail.ignoreKeys
            ignoreMixins = new Set(ev.detail.ignoreMixins)
            updateKeys()
            getMixins()
          }}
          on:click={(ev) => {
            fullSize = true
            rightSection = ev.detail.presenter
          }}
        />
      {/if}
    </div>
    {#if mixins.length > 0}
      <div class="mixin-container">
        <div
          class="mixin-selector"
          style={getMixinStyle(objectClass._id, selectedClass === objectClass._id)}
          on:click={() => {
            selectedClass = objectClass._id
          }}
        >
          <Label label={objectClass.label} />
        </div>
        {#each mixins as mixin}
          <div
            class="mixin-selector"
            style={getMixinStyle(mixin._id, selectedClass === mixin._id)}
            on:click={() => {
              selectedClass = mixin._id
            }}
          >
            <Label label={mixin.label} />
          </div>
        {/each}
      </div>
    {/if}
    {#each collectionEditors as collection}
      {#if collection.editor}
        <div class="mt-14">
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
<style lang="scss">
  .main-editor {
    display: flex;
    justify-content: center;
    flex-direction: column;
  }
  .mixin-container {
    margin-top: 2rem;
    display: flex;
    .mixin-selector {
      margin-left: 0.5rem;
      cursor: pointer;
      height: 1.5rem;
      min-width: 5.25rem;

      border-radius: 0.5rem;

      font-weight: 500;
      font-size: 0.625rem;

      text-transform: uppercase;
      color: var(--theme-caption-color);

      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
