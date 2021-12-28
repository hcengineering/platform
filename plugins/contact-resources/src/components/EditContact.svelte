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
  import { AnyComponent, Component, Label, Icon } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'

  export let _id: Ref<Contact>
  let object: Contact
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

  const dispatch = createEventDispatcher()

  let keys: KeyedAttribute[] = []
  let collectionKeys: KeyedAttribute[] = []

  let mixinsRef: Ref<Mixin<Doc>>[] = []
  let mixins: {
    mixin: Ref<Mixin<Doc>>
    keys: KeyedAttribute[]
    collectionKeys: KeyedAttribute[]
    _class: Mixin<Doc>
  }[] = []

  function filterKeys (keys: KeyedAttribute[], ignoreKeys: string[]): KeyedAttribute[] {
    keys = keys.filter((k) => !docKeys.has(k.key))
    keys = keys.filter((k) => !ignoreKeys.includes(k.key))
    return keys
  }

  function getFiltredKeys (ignoreKeys: string[]): KeyedAttribute[] {
    const keys = [...hierarchy.getAllAttributes(object._class).entries()]
      .filter(([, value]) => value.hidden !== true)
      .map(([key, attr]) => ({ key, attr }))

    return filterKeys(keys, ignoreKeys)
  }

  function updateKeys (ignoreKeys: string[]): void {
    const h = client.getHierarchy()

    const filtredKeys = getFiltredKeys(ignoreKeys)
    keys = collectionsFilter(filtredKeys, false)
    collectionKeys = collectionsFilter(filtredKeys, true)

    // We need to add mixin keys
    mixinsRef = h
      .getDescendants(contact.class.Contact)
      .filter((m) => h.getClass(m).kind === ClassifierKind.MIXIN && h.hasMixin(object, m)) as Ref<Mixin<Doc>>[]
    mixins = mixinsRef.map((m) => {
      const mKeys = filterKeys(
        [...hierarchy.getAllAttributes(m, contact.class.Contact).entries()]
          .filter(([, value]) => value.hidden !== true)
          .map(([key, attr]) => ({ key, attr })),
        ignoreKeys
      )
      return {
        mixin: m,
        keys: collectionsFilter(mKeys, false),
        collectionKeys: collectionsFilter(mKeys, true),
        _class: client.getHierarchy().getClass(m)
      }
    })
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

  async function getCollectionEditor (key: KeyedAttribute): Promise<AnyComponent> {
    const attrClass = getAttributePresenterClass(key.attr)
    const clazz = client.getHierarchy().getClass(attrClass)
    const editorMixin = client.getHierarchy().as(clazz, view.mixin.AttributeEditor)
    return editorMixin.editor
  }

  $: icon = object && (hierarchy.getClass(object._class).icon as Asset)
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
    {#await getEditor(object._class) then is}
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

    {#each mixins as mixin}
      <div class='mixin-container'>
        <div class='header'>
          <div class='icon'>
          </div>
          <Label label={mixin._class.label} />
        </div>
        <div class='attributes'>
          {#if mixin.keys.length > 0}
          <AttributesBar {object} keys={mixin.keys} />
          {/if}
        </div>
        <div class='collections'>
          {#each mixin.collectionKeys as collection}
            <div class="mt-14">
              {#await getCollectionEditor(collection) then is}
              <Component {is} props={{ objectId: object._id, _class: object._class, space: object.space }} />
              {/await}
            </div>
          {/each}
        </div>
      </div>
    {/each}
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

        background: #77C07B;
        border: 2px solid #18181E;
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
</style>
