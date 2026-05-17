<!--
//
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
//
-->
<script lang="ts">
  import { MasterTag } from '@hcengineering/card'
  import core, { Doc, Mixin, Ref } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { DropdownLabels, DropdownLabelsIntl, Label, Toggle } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import card from '../../plugin'
  import setting from '@hcengineering/setting'

  export let masterTag: Ref<MasterTag>

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const ancestors = hierarchy.getAncestors(masterTag)
  const mixins = hierarchy.getAllPossibleMixins(masterTag)
  const current = hierarchy.classHierarchyMixin(masterTag, core.mixin.VersionableClass)

  const mixinsItems = mixins.map((it) => {
    const cl = hierarchy.getClass(it)
    return { label: cl.label, id: it }
  })

  let excludedRelations = new Set<string>(current?.excludedRelations ?? [])
  let excludedProperties = new Set<string>(current?.excludedProperties ?? [])
  let excludeMixins = new Set<Ref<Mixin<Doc>>>(current?.excludeMixins ?? [])

  $: selectedMixins = mixins.filter((it) => !excludeMixins.has(it))

  const systemFields = [
    '_class',
    'id',
    'createdOn',
    'modifiedOn',
    'modifiedBy',
    'createdBy',
    'createdOn',
    'rank',
    'title',
    'space',
    'version',
    'icon',
    'color',
    'todos',
    'comments'
  ]
  const allProperties = hierarchy
    .getAllAttributes(masterTag, core.class.Doc)
    .values()
    .toArray()
    .filter((it) => {
      if (systemFields.includes(it.name)) return false
      return true
    })
    .map((p) => {
      return { label: p.label, id: p.name }
    })

  $: selectedProperties = allProperties.filter((it) => !excludedProperties.has(it.id)).map((it) => it.id)

  const targets = new Set([...ancestors, ...mixins])
  const associations = client.getModel().findAllSync(core.class.Association, {})
  const relationsA = associations.filter((it) => targets.has(it.classB))
  const relationsB = associations.filter((it) => targets.has(it.classA))

  async function save (): Promise<void> {
    if (current?._id === masterTag) {
      await client.updateMixin(masterTag, card.class.MasterTag, core.space.Model, core.mixin.VersionableClass, {
        excludedRelations: [...excludedRelations],
        excludedProperties: [...excludedProperties],
        excludeMixins: [...excludeMixins],
        enabled: true
      })
    } else {
      await client.createMixin(masterTag, card.class.MasterTag, core.space.Model, core.mixin.VersionableClass, {
        excludedRelations: [...excludedRelations],
        excludedProperties: [...excludedProperties],
        excludeMixins: [...excludeMixins],
        enabled: true
      })
    }
    dispatch('close')
  }

  function propertiesSelected (event: CustomEvent): void {
    const selectedProperties = event.detail as string[]
    allProperties.forEach((it) => {
      if (!selectedProperties.includes(it.id)) {
        excludedProperties.add(it.id)
      } else {
        excludedProperties.delete(it.id)
      }
    })
    excludedProperties = excludedProperties
  }

  function mixinsSelected (event: CustomEvent): void {
    const selectedMixins = event.detail as string[]
    mixins.forEach((it) => {
      if (!selectedMixins.includes(it)) {
        excludeMixins.add(it)
      } else {
        excludeMixins.delete(it)
      }
    })
    excludeMixins = excludeMixins
  }
</script>

<Card label={card.string.NewVersion} canSave={true} width={'medium'} okAction={save} on:close>
  <div class="flex-col flex-gap-2">
    <div class="flex-between">
      <Label label={setting.string.Properties} />
      <div class="max-w-40">
        <DropdownLabelsIntl
          width="100%"
          items={allProperties}
          multiselect
          selected={selectedProperties}
          on:selected={propertiesSelected}
        />
      </div>
    </div>
    <div class="flex-between">
      <Label label={card.string.Tags} />
      <div class="max-w-40">
        <DropdownLabelsIntl
          width="100%"
          items={mixinsItems}
          multiselect
          selected={selectedMixins}
          on:selected={mixinsSelected}
        />
      </div>
    </div>
    {#if relationsA.length > 0 || relationsB.length > 0}
      <div class="divider" />
      <div>
        <Label label={card.string.RelationCopyDescr} />
      </div>
      <div class="grid">
        {#each relationsB as assoc}
          {@const id = `${assoc._id}_b`}
          <span>{assoc.nameB}</span>
          <Toggle
            on={!excludedRelations.has(id)}
            on:change={(e) => {
              if (e.detail === true) {
                excludedRelations.delete(id)
              } else {
                excludedRelations.add(id)
              }
              excludedRelations = excludedRelations
            }}
          />
        {/each}
        {#each relationsA as assoc}
          {@const id = `${assoc._id}_a`}
          <span>{assoc.nameA}</span>
          <Toggle
            on={!excludedRelations.has(id)}
            on:change={(e) => {
              if (e.detail === true) {
                excludedRelations.delete(id)
              } else {
                excludedRelations.add(id)
              }
              excludedRelations = excludedRelations
            }}
          />
        {/each}
      </div>
    {/if}
  </div>
</Card>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 3fr 1fr;
    grid-auto-rows: minmax(1rem, max-content);
    justify-content: start;
    width: 100%;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 1rem;
    height: min-content;
  }
</style>
