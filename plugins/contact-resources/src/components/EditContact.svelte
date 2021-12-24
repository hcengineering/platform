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
  import { createEventDispatcher } from 'svelte'
  import { Class, Doc, Ref } from '@anticrm/core'
  import { Component, AnyComponent } from '@anticrm/ui'
  import { AttributesBar, getClient, createQuery, getAttributePresenterClass } from '@anticrm/presentation'
  import { Panel } from '@anticrm/panel'
  import contact from '../plugin'
  import { Contact, formatName } from '@anticrm/contact'
  import core from '@anticrm/core'
  import { Asset } from '@anticrm/platform'
  import view from '@anticrm/view'

  export let _id: Ref<Contact>
  let object: Contact
  let rightSection: AnyComponent | undefined
  let fullSize: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const docKeys: Set<string> = new Set<string>(hierarchy.getAllAttributes(core.class.AttachedDoc).keys())

  const query = createQuery()
  $: _id &&
    query.query(contact.class.Contact, { _id }, (result) => {
      object = result[0]
    })

  const dispatch = createEventDispatcher()

  let keys: string[] = []
  let collectionKeys: string[] = []

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
          getKeys(ev.detail.ignoreKeys)
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
  </Panel>
{/if}

<style lang="scss">
  .name {
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }
  .channels {
    margin-top: 0.75rem;
    span {
      margin-left: 0.5rem;
    }
  }
</style>
