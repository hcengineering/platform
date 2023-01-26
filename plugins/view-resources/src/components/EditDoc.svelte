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
  import contact, { formatName } from '@hcengineering/contact'
  import { Class, ClassifierKind, Doc, Mixin, Obj, Ref } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Panel } from '@hcengineering/panel'
  import { Asset, getResource, translate } from '@hcengineering/platform'
  import {
    AttributeCategory,
    AttributeCategoryOrder,
    AttributesBar,
    createQuery,
    getAttributePresenterClass,
    getClient,
    KeyedAttribute
  } from '@hcengineering/presentation'
  import { AnyComponent, Button, Component, IconMoreH, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { ContextMenu } from '..'
  import { categorizeFields, getCollectionCounter, getFiltredKeys } from '../utils'
  import ActionContext from './ActionContext.svelte'
  import DocAttributeBar from './DocAttributeBar.svelte'
  import UpDownNavigator from './UpDownNavigator.svelte'
  import IconMixin from './icons/Mixin.svelte'

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
  $: if (_id && _class) {
    query.query(_class, { _id }, (result) => {
      object = result[0]
      realObjectClass = object._class
    })
  } else {
    query.unsubscribe()
  }

  let oldClass: Ref<Class<Doc>>

  $: if (_class !== oldClass) {
    oldClass = _class
    mainEditor = undefined
  }

  let keys: KeyedAttribute[] = []
  let fieldEditors: { key: KeyedAttribute; editor: AnyComponent; category: AttributeCategory }[] = []

  let mixins: Mixin<Doc>[] = []

  let showAllMixins = false

  const dispatch = createEventDispatcher()

  function getMixins (parentClass: Ref<Class<Doc>>, object: Doc, showAllMixins: boolean): void {
    if (object === undefined || parentClass === undefined) return
    const descendants = hierarchy.getDescendants(parentClass).map((p) => hierarchy.getClass(p))

    mixins = descendants.filter(
      (m) =>
        m.kind === ClassifierKind.MIXIN &&
        !ignoreMixins.has(m._id) &&
        (hierarchy.hasMixin(object, m._id) ||
          (showAllMixins && hierarchy.isDerived(realObjectClass, hierarchy.getBaseClass(m._id))))
    )
  }

  $: getMixins(parentClass, object, showAllMixins)

  let ignoreKeys: string[] = []
  let activityOptions = { enabled: true, showInput: true }
  let allowedCollections: string[] = []
  let collectionArrays: string[] = []
  let inplaceAttributes: string[] = []
  let ignoreMixins: Set<Ref<Mixin<Doc>>> = new Set<Ref<Mixin<Doc>>>()

  async function updateKeys (showAllMixins: boolean): Promise<void> {
    const keysMap = new Map(getFiltredKeys(hierarchy, realObjectClass, ignoreKeys).map((p) => [p.attr._id, p]))
    for (const m of mixins) {
      const mkeys = getFiltredKeys(hierarchy, m._id, ignoreKeys)
      for (const key of mkeys) {
        keysMap.set(key.attr._id, key)
      }
    }
    const filtredKeys = Array.from(keysMap.values())

    const { attributes, collections } = categorizeFields(hierarchy, filtredKeys, collectionArrays, allowedCollections)
    keys = attributes.map((it) => it.key)

    const editors: { key: KeyedAttribute; editor: AnyComponent; category: AttributeCategory }[] = []
    const newInplaceAttributes = []
    for (const k of collections) {
      if (allowedCollections.includes(k.key.key)) continue
      const editor = await getFieldEditor(k.key)
      if (editor === undefined) continue
      if (k.category === 'inplace') {
        newInplaceAttributes.push(k.key.key)
      }
      editors.push({ key: k.key, editor, category: k.category })
    }
    inplaceAttributes = newInplaceAttributes
    fieldEditors = editors.sort((a, b) => AttributeCategoryOrder[a.category] - AttributeCategoryOrder[b.category])
  }

  interface MixinEditor {
    editor: AnyComponent
    pinned?: boolean
  }

  async function getEditor (_class: Ref<Class<Doc>>): Promise<MixinEditor> {
    const clazz = hierarchy.getClass(_class)
    const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
    if (editorMixin?.editor == null && clazz.extends != null) return getEditor(clazz.extends)
    return { editor: editorMixin.editor, pinned: editorMixin?.pinned }
  }

  let mainEditor: MixinEditor | undefined
  $: getEditorOrDefault(realObjectClass, showAllMixins, _id)

  async function getEditorOrDefault (_class: Ref<Class<Doc>>, showAllMixins: boolean, _id: Ref<Doc>): Promise<void> {
    parentClass = getParentClass(_class)
    mainEditor = await getEditor(_class)
    updateKeys(showAllMixins)
  }

  async function getFieldEditor (key: KeyedAttribute): Promise<AnyComponent | undefined> {
    const attrClass = getAttributePresenterClass(hierarchy, key.attr)
    const clazz = hierarchy.getClass(attrClass.attrClass)
    const mix = {
      array: view.mixin.ArrayEditor,
      collection: view.mixin.CollectionEditor,
      inplace: view.mixin.InlineAttributEditor,
      attribute: view.mixin.AttributeEditor,
      object: undefined
    }
    const mixinRef = mix[attrClass.category]
    if (mixinRef) {
      const editorMixin = hierarchy.as(clazz, mixinRef)
      return editorMixin.editor
    } else {
      return undefined
    }
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

  function showMenu (ev?: Event): void {
    if (object !== undefined) {
      showPopup(ContextMenu, { object }, (ev as MouseEvent).target as HTMLElement)
    }
  }
  function handleOpen (ev: CustomEvent): void {
    ignoreKeys = ev.detail.ignoreKeys
    activityOptions = ev.detail.activityOptions ?? activityOptions
    ignoreMixins = new Set(ev.detail.ignoreMixins)
    allowedCollections = ev.detail.allowedCollections ?? []
    collectionArrays = ev.detail.collectionArrays ?? []
    getMixins(parentClass, object, showAllMixins)
    updateKeys(showAllMixins)
  }
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
    isHeader={mainEditor?.pinned ?? false}
    isAside={true}
    bind:panelWidth
    bind:innerWidth
    on:update={(ev) => _update(ev.detail)}
    on:close={() => {
      dispatch('close')
    }}
    withoutActivity={!activityOptions.enabled}
    withoutInput={!activityOptions.showInput}
  >
    <svelte:fragment slot="navigator">
      <UpDownNavigator element={object} />
    </svelte:fragment>

    <svelte:fragment slot="utils">
      <div class="p-1">
        <Button icon={IconMoreH} kind={'transparent'} size={'medium'} on:click={showMenu} />
      </div>
    </svelte:fragment>

    <svelte:fragment slot="attributes" let:direction={dir}>
      <div class="flex flex-reverse flex-grow">
        <Button
          kind={'transparent'}
          shape={'round'}
          selected={showAllMixins}
          on:click={() => {
            showAllMixins = !showAllMixins
          }}
        >
          <svelte:fragment slot="content">
            <IconMixin size={'small'} />
          </svelte:fragment>
        </Button>
      </div>
      {#if !headerLoading}
        {#if headerEditor !== undefined}
          <Component
            is={headerEditor}
            props={{ object, keys, mixins, ignoreKeys, vertical: dir === 'column', allowedCollections }}
            on:update={() => updateKeys(showAllMixins)}
          />
        {:else if dir === 'column'}
          <DocAttributeBar
            {object}
            {mixins}
            ignoreKeys={[...ignoreKeys, ...collectionArrays, ...inplaceAttributes]}
            {allowedCollections}
            on:update={() => updateKeys(showAllMixins)}
          />
        {:else}
          <AttributesBar {object} _class={realObjectClass} {keys} />
        {/if}
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="subheader">
      {#if mainEditor && mainEditor.pinned}
        <div class="flex-col flex-grow step-tb-6">
          <Component is={mainEditor.editor} props={{ object }} on:open={handleOpen} />
        </div>
      {/if}
    </svelte:fragment>

    {#if mainEditor && !mainEditor.pinned}
      <div class="flex-col flex-grow flex-no-shrink step-tb-6">
        <Component is={mainEditor.editor} props={{ object }} on:open={handleOpen} />
      </div>
    {/if}

    {#each fieldEditors as collection}
      {#if collection.editor}
        <div class="step-tb-6">
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
