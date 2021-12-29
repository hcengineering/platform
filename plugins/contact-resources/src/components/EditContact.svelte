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
  import { ActionIcon, AnyComponent, Component, Label } from '@anticrm/ui'
  
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
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
    mixins = h.getDescendants(contact.class.Contact)
      .filter((m) => h.getClass(m).kind === ClassifierKind.MIXIN && h.hasMixin(object, m)).map(m => h.getClass(m) as Mixin<Doc>)
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

  async function getEditorOrDefault (_class: Ref<Class<Doc>> | undefined, defaultClass: Ref<Class<Doc>>): Promise<AnyComponent> {
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
    <div slot="subtitle" class="flex flex-reverse flex-grow">
      <div class='flex'>
        {#if mixins.length > 0}
          <div class='mixin-selector' class:selected={selectedClass === objectClass._id}>
            <ActionIcon icon={objectClass.icon} size={'medium'} label={objectClass.label} action={() => {
              selectedClass = objectClass._id
              selectedMixin = undefined
            }} />
          </div>
          {#each mixins as mixin}
            <div class='mixin-selector' class:selected={selectedClass === mixin._id}>
              <ActionIcon icon={mixin.icon} size={'medium'} label={mixin.label} action={() => {
                selectedClass = mixin._id
                selectedMixin = mixin
              }} />
            </div>
          {/each}
        {/if}
      </div>
      <div class="flex-grow">
        {#if keys}
          <AttributesBar {object} {keys} />
        {/if}
      </div>
    </div>
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
    {#each collectionKeys as collection}
      <div class="mt-14">
        {#await getCollectionEditor(collection) then is}
          <Component {is} props={{ objectId: object._id, _class: object._class, space: object.space }} />
        {/await}
      </div>
    {/each}

    <!-- {#each mixins as mixin}
      <div class="mixin-container">
        <div class="header">
          <div class="icon" />
          <Label label={mixin._class.label} />
        </div>
        <div class="attributes">
          {#if mixin.keys.length > 0}
            <AttributesBar {object} keys={mixin.keys} />
          {/if}
        </div>
        <div class="collections">
          {#each mixin.collectionKeys as collection}
            <div class="mt-14">
              {#await getCollectionEditor(collection) then is}
                <Component {is} props={{ objectId: object._id, _class: object._class, space: object.space }} />
              {/await}
            </div>
          {/each}
        </div>
      </div>
    {/each} -->
  </Panel>
{/if}

<style lang="scss">
  .mixin-container {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--theme-zone-bg);
    .header {
      display: flex;
      font-weight: 500;
      font-size: 16px;
      line-height: 150%;
      align-items: center;
      .icon {
        width: 10px;
        height: 10px;
        /* Dark / Green 01 */

        background: #77c07b;
        border: 2px solid #18181e;
        border-radius: 50px;
        margin-right: 1rem;
      }
    }
    .attributes {
      margin: 1rem;
    }
    .collections {
      margin: 1rem;
    }

  }
  .mixin-selector {
    opacity: 0.6;
    margin: 0.25rem;

    &.selected { 
      opacity: 1 !important;
    }
  }
</style>
