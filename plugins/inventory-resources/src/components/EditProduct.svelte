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
  import core, { Doc, Ref } from '@anticrm/core'
  import { Category, Product } from '@anticrm/inventory'
  import { Panel } from '@anticrm/panel'
  import {
    AttributesBar,
    createQuery,
    getAttributePresenterClass,
    getClient,
    KeyedAttribute
  } from '@anticrm/presentation'
  import { AnyComponent, Component } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import inventory from '../plugin'

  export let _id: Ref<Product>
  let object: Product
  let rightSection: AnyComponent | undefined
  const fullSize: boolean = true
  let category: Category | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const docKeys: Set<string> = new Set<string>(hierarchy.getAllAttributes(core.class.AttachedDoc).keys())

  const query = createQuery()
  $: _id && update(_id)

  function update (id: Ref<Product>) {
    query.query(inventory.class.Product, { _id: id }, (result) => {
      object = result[0]
      client.findOne(inventory.class.Category, { _id: object.attachedTo as Ref<Category> }).then((res) => {
        category = res
      })
      updateKeys(['comments'])
    })
  }

  let keys: KeyedAttribute[] = []
  let collectionKeys: KeyedAttribute[] = []

  const dispatch = createEventDispatcher()

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
    const filtredKeys = getFiltredKeys(ignoreKeys)
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

  async function getCollectionEditor (key: KeyedAttribute): Promise<AnyComponent> {
    const attrClass = getAttributePresenterClass(key.attr)
    const clazz = client.getHierarchy().getClass(attrClass)
    const editorMixin = client.getHierarchy().as(clazz, view.mixin.AttributeEditor)
    return editorMixin.editor
  }

  function getCollectionCounter (object: Doc, key: KeyedAttribute): number {
    if (client.getHierarchy().isMixin(key.attr.attributeOf)) {
      return (client.getHierarchy().as(object, key.attr.attributeOf) as any)[key.key]
    }
    return (object as any)[key.key] ?? 0
  }
</script>

{#if object !== undefined}
  <Panel
    icon={inventory.icon.Products}
    title={object.name}
    subtitle={category?.name}
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
    {#each collectionKeys as collection}
      <div class="collection">
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
{/if}

<style lang="scss">
  .main-editor {
    display: flex;
    justify-content: center;
    flex-direction: column;
  }

  .collection + .collection {
    margin-top: 3.5rem;
  }
</style>
