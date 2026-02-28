<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Card } from '@hcengineering/card'
  import { PermissionsStore } from '@hcengineering/contact'
  import { permissionsStore } from '@hcengineering/contact-resources'
  import core, { AnyAttribute, Class, Doc, Ref, toRank, TypedSpace } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import {
    AttributeBarEditor,
    createQuery,
    getClient,
    isCollectionAttr,
    KeyedAttribute
  } from '@hcengineering/presentation'
  import { canChangeAttribute } from '@hcengineering/view-resources'

  export let object: Card
  export let _class: Ref<Class<Doc>>
  export let to: Ref<Class<Doc>> | undefined = core.class.Obj
  export let ignoreKeys: string[] = []
  export let readonly = false
  export let showHeader: boolean = true
  export let fourRows: boolean = false
  export let showCollaborators: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let keys: KeyedAttribute[] = []

  function updateKeys (_class: Ref<Class<Doc>>, ignoreKeys: string[], to: Ref<Class<Doc>> | undefined): void {
    const filtredKeys = [...hierarchy.getAllAttributes(_class, to).entries()]
      .filter(
        ([key, value]) =>
          value.hidden !== true && !ignoreKeys.includes(key) && !isCollectionAttr(hierarchy, { key, attr: value })
      )
      .map(([key, attr]) => ({ key, attr }))

    keys = filtredKeys.sort((a, b) => {
      const rankA = a.attr.rank ?? toRank(a.attr._id) ?? ''
      const rankB = b.attr.rank ?? toRank(b.attr._id) ?? ''
      return rankA.localeCompare(rankB)
    })
  }

  $: updateKeys(_class, ignoreKeys, to)

  const query = createQuery()
  $: query.query(core.class.Attribute, { attributeOf: _class }, () => {
    updateKeys(_class, ignoreKeys, to)
  })

  function canChange (attr: AnyAttribute, permissionsStore: PermissionsStore): boolean {
    return canChangeAttribute(attr, object.space as Ref<TypedSpace>, permissionsStore, _class)
  }
</script>

<div class="grid" class:fourRows>
  {#each keys as key}
    <AttributeBarEditor
      {key}
      {_class}
      {object}
      {showHeader}
      readonly={readonly || !canChange(key.attr, $permissionsStore) || object.readonlyFields?.includes(key.key)}
      withIcon
      on:update
    />
  {/each}
  {#if showCollaborators}
    <AttributeBarEditor
      key={'collaborators'}
      _class={notification.mixin.Collaborators}
      {object}
      {showHeader}
      {readonly}
      withIcon
      on:update
    />
  {/if}
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.25rem;
    -moz-column-gap: 1rem;
    column-gap: 1rem;

    &.fourRows {
      grid-template-columns: 1fr 1.5fr 1fr 1.5fr;
    }
  }
</style>
