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
  import { Contact, formatName } from '@anticrm/contact'
  import core, { Class, ClassifierKind, Doc, Mixin, Ref } from '@anticrm/core'
  import { Panel } from '@anticrm/panel'
  import { Asset } from '@anticrm/platform'
  import {
    AttributesBar,
    createQuery,
    getAttributePresenterClass,
    getClient,
    KeyedAttribute
  } from '@anticrm/presentation'
  import { AnyComponent, Component, getPlatformColorForText, Label } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import contact from '../plugin'

  export let _id: Ref<Contact>
  let object: Contact
  let objectClass: Class<Doc>
  let rightSection: AnyComponent | undefined
  let fullSize: boolean = true

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const docKeys: Set<string> = new Set<string>(hierarchy.getAllAttributes(core.class.AttachedDoc).keys())

  const query = createQuery()
  $: _id &&
    query.query(contact.class.Contact, { _id }, (result) => {
      object = result[0]
    })

  $: if (object) objectClass = client.getHierarchy().getClass(object._class)

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
    const h = client.getHierarchy()
    mixins = h
      .getDescendants(contact.class.Contact)
      .filter((m) => h.getClass(m).kind === ClassifierKind.MIXIN && h.hasMixin(object, m))
      .map((m) => h.getClass(m) as Mixin<Doc>)
  }

  const dispatch = createEventDispatcher()

  function filterKeys (keys: KeyedAttribute[], ignoreKeys: string[]): KeyedAttribute[] {
    keys = keys.filter((k) => !docKeys.has(k.key))
    keys = keys.filter((k) => !ignoreKeys.includes(k.key))
    return keys
  }

  function getFiltredKeys (objectClass: Ref<Class<Doc>>, ignoreKeys: string[]): KeyedAttribute[] {
    const keys = [...hierarchy.getAllAttributes(objectClass).entries()]
      .filter(([, value]) => value.hidden !== true)
      .map(([key, attr]) => ({ key, attr }))

    return filterKeys(keys, ignoreKeys)
  }

  function updateKeys (ignoreKeys: string[]): void {
    const filtredKeys = getFiltredKeys(selectedClass ?? object._class, ignoreKeys)
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

  $: icon = (objectClass?.icon ?? contact.class.Person) as Asset

  function getStyle (id: Ref<Class<Doc>>, selected: boolean): string {
    const color = getPlatformColorForText(id as string)
    return `
      background: ${color + (selected ? 'ff' : '33')};
      border: 1px solid ${color + (selected ? '0f' : '66')};
    `
  }

  let mainEditor: HTMLElement
  let prevEditor: HTMLElement
  let maxHeight = 0
  const observer = new ResizeObserver(() => {
    const curHeight = mainEditor.clientHeight
    maxHeight = Math.max(maxHeight, curHeight)
  })

  $: if (mainEditor != null) {
    if (prevEditor != null) {
      observer.unobserve(prevEditor)
    }
    prevEditor = mainEditor
    observer.observe(mainEditor)
  }

  onDestroy(() => {
    observer.disconnect()
  })
</script>

{#if object !== undefined}
  <Panel
    {icon}
    title={formatName(object.name)}
    {rightSection}
    {fullSize}
    {object}
    on:close={() => {
      dispatch('close')
    }}
  >
    <div slot="subtitle">
      {#if keys}
        <AttributesBar {object} {keys} />
      {/if}
    </div>
    <div class='main-editor' bind:this={mainEditor} style={`min-height: ${maxHeight}px;`}>
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
        <div class="mixin-selector" 
          style={getStyle(objectClass._id, selectedClass === objectClass._id)} 
          on:click={() => { selectedClass = objectClass._id; selectedMixin = undefined }}>
          <Label label={objectClass.label} />
        </div>
        {#each mixins as mixin}
          <div class="mixin-selector" 
          style={getStyle(mixin._id, selectedClass === mixin._id)} 
          on:click={() => { selectedClass = mixin._id; selectedMixin = mixin }}>
            <Label label={mixin.label} />
          </div>
        {/each}
      </div>
    {/if}
    {#each collectionKeys as collection}
      <div class="mt-14">
        {#await getCollectionEditor(collection) then is}
          <Component {is} props={{ objectId: object._id, _class: object._class, space: object.space }} />
        {/await}
      </div>
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
      margin-left: 8px;
      cursor: pointer;
      height: 24px;
      min-width: 84px;
      
      border-radius: 8px;

      font-weight: 500;
      font-size: 10px;

      text-transform: uppercase;
      color: #FFFFFF;

      display: flex;
      align-items: center;
      justify-content: center;
    }
    .attributes {
      margin: 1rem;
    }
    .collections {
      margin: 1rem;
    }
  }
</style>
