<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Card, Tag } from '@hcengineering/card'
  import core, { Class, Doc, Ref, toRank } from '@hcengineering/core'
  import { getClient, KeyedAttribute, updateAttribute } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { MarkupEditor } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  export let doc: Card
  export let tag: Tag | undefined
  export let readonly: boolean = false

  let keys: KeyedAttribute[] = []

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function updateKeys (_class: Ref<Class<Doc>>, to: Ref<Class<Doc>> | undefined): void {
    console.log('tag', _class, to)
    const filtredKeys = [...hierarchy.getAllAttributes(_class, to).entries()]
      .filter(([key, value]) => value.hidden !== true && value.type._class === core.class.TypeMarkup)
      .map(([key, attr]) => ({ key, attr }))

    keys = filtredKeys.sort((a, b) => {
      const rankA = a.attr.rank ?? toRank(a.attr._id) ?? ''
      const rankB = b.attr.rank ?? toRank(b.attr._id) ?? ''
      return rankA.localeCompare(rankB)
    })
  }

  $: _class = tag?._id ?? doc._class
  $: to = tag?.extends
  $: updateKeys(_class, to)

  function getValue (doc: Card, key: string): string {
    const target = tag !== undefined ? hierarchy.as(doc, tag._id) : doc
    return (target as any)[key]
  }

  function onChange (value: any, attr: KeyedAttribute): void {
    dispatch('update', { key: attr, value })

    void updateAttribute(client, doc, doc._class, attr, value, false, {
      objectId: doc._id
    })
  }
</script>

{#each keys as key}
  <div class="px-4 w-full">
    <span>
      <Label label={key.attr.label} />
      {#if tag}
        <span class="text-xs">
          (<Label label={tag.label} />)
        </span>
      {/if}
    </span>
    <MarkupEditor
      value={getValue(doc, key.key)}
      onChange={(value) => {
        onChange(value, key)
      }}
      {readonly}
    />
  </div>
{/each}
