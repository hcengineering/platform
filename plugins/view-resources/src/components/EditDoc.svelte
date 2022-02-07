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
  import core, { Class, ClassifierKind, Doc, Mixin, Obj, Ref } from '@anticrm/core'
  import { Panel } from '@anticrm/panel'
  import { Asset, translate } from '@anticrm/platform'
  import {
    AttributesBar,
    createQuery,
    getAttributePresenterClass,
    getClient,
    KeyedAttribute
  } from '@anticrm/presentation'
  import { AnyComponent, Component, Label } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import { getMixinStyle } from '../utils'

  export let _id: Ref<Doc>
  export let _class: Ref<Class<Doc>>
  export let rightSection: AnyComponent | undefined = undefined
  let object: Doc
  let objectClass: Class<Doc>
  let parentClass: Ref<Class<Doc>>
  let fullSize: boolean = true

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const docKeys: Set<string> = new Set<string>(hierarchy.getAllAttributes(core.class.AttachedDoc).keys())

  const query = createQuery()
  $: _id &&
    _class &&
    query.query(_class, { _id }, (result) => {
      object = result[0]
    })

  $: if (object) objectClass = hierarchy.getClass(object._class)

  let selectedClass: Ref<Class<Doc>> | undefined
  let prevSelected = selectedClass

  let keys: KeyedAttribute[] = []
  let collectionKeys: KeyedAttribute[] = []

  let mixins: Mixin<Doc>[] = []

  let selectedMixin: Mixin<Doc> | undefined

  $: if (object && prevSelected !== object._class) {
    prevSelected = object._class
    selectedClass = objectClass._id
    selectedMixin = undefined
    parentClass = getParentClass(object._class)
    mixins = getMixins()
  }

  const dispatch = createEventDispatcher()

  function getMixins (): Mixin<Doc>[] {
    const descendants = hierarchy.getDescendants(parentClass)
    const mixins = descendants.filter(
      (m) => hierarchy.getClass(m).kind === ClassifierKind.MIXIN && hierarchy.hasMixin(object, m)
    )
    return mixins.map((m) => hierarchy.getClass(m) as Mixin<Doc>)
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

  function updateKeys (ignoreKeys: string[]): void {
    const filtredKeys = getFiltredKeys(
      selectedClass ?? object._class,
      ignoreKeys,
      selectedClass !== objectClass._id ? objectClass._id : undefined
    )
    keys = collectionsFilter(filtredKeys, false)
    collectionKeys = collectionsFilter(filtredKeys, true)
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

  async function getEditorOrDefault (
    _class: Ref<Class<Doc>> | undefined,
    defaultClass: Ref<Class<Doc>>
  ): Promise<AnyComponent> {
    const editor = _class !== undefined ? await getEditor(_class) : undefined
    if (editor !== undefined) {
      return editor
    }
    return getEditor(defaultClass)
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

  function getCollectionCounter (object: Doc, key: KeyedAttribute): number {
    if (hierarchy.isMixin(key.attr.attributeOf)) {
      return (hierarchy.as(object, key.attr.attributeOf) as any)[key.key]
    }
    return (object as any)[key.key] ?? 0
  }

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
</script>

{#if object !== undefined}
  {#await getTitle(object) then title}
    <Panel
      {icon}
      {title}
      {rightSection}
      {fullSize}
      {object}
      on:close={() => {
        dispatch('close')
      }}
    >
      <div class="w-full" slot="subtitle">
        {#await getHeaderEditor(object._class) then is}
          {#if is}
            <Component {is} props={{ object, keys }} />
          {:else}
            <AttributesBar {object} {keys} />
          {/if}
        {/await}
      </div>
      <div class="main-editor">
        {#await getEditorOrDefault(selectedClass, object._class) then is}
          <Component
            {is}
            props={{ object }}
            on:open={(ev) => {
              updateKeys(ev.detail.ignoreKeys)
            }}
            on:click={(ev) => {
              fullSize = true
              rightSection = ev.detail.presenter
            }}
          />
        {/await}
      </div>
      {#if mixins.length > 0}
        <div class="mixin-container">
          <div
            class="mixin-selector"
            style={getMixinStyle(objectClass._id, selectedClass === objectClass._id)}
            on:click={() => {
              selectedClass = objectClass._id
              selectedMixin = undefined
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
                selectedMixin = mixin
              }}
            >
              <Label label={mixin.label} />
            </div>
          {/each}
        </div>
      {/if}
      {#each collectionKeys as collection}
        <div class="mt-14">
          {#await getCollectionEditor(collection) then is}
            <Component
              {is}
              props={{
                objectId: object._id,
                _class: object._class,
                space: object.space,
                [collection.key]: getCollectionCounter(object, collection)
              }}
            />
          {/await}
        </div>
      {/each}
    </Panel>
  {/await}
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
      color: #ffffff;

      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
