<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import core, { Association, AssociationQuery, Doc } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { createEventDispatcher } from 'svelte'

  import RelationEditor from './RelationEditor.svelte'

  export let object: Doc
  export let readonly: boolean = false
  export let emptyKind: 'create' | 'placeholder' = 'create'

  const client = getClient()
  const dispatch = createEventDispatcher()
  const h = client.getHierarchy()

  let associationsA: Association[] = []
  let associationsB: Association[] = []

  function getAssociations (object: Doc): void {
    const parents = h.getAncestors(object._class)
    const mixins = h.findAllMixins(object)
    associationsB = client
      .getModel()
      .findAllSync(core.class.Association, { classA: { $in: [...parents, ...mixins] } })
      .filter((a) => a.nameB.trim().length > 0)
    associationsA = client
      .getModel()
      .findAllSync(core.class.Association, { classB: { $in: [...parents, ...mixins] } })
      .filter((a) => a.nameA.trim().length > 0)
  }

  $: getAssociations(object)

  const q = createQuery()
  $: q.query(core.class.Association, {}, () => {
    getAssociations(object)
  })

  let relations: Record<string, Doc[]> = {}
  let relationsLoaded = false
  $: associations = [
    ...associationsA.map((a) => [a._id, -1] as AssociationQuery),
    ...associationsB.map((a) => [a._id, 1] as AssociationQuery)
  ]

  const queryA = createQuery()
  $: queryA.query(
    object._class,
    { _id: object._id },
    (res) => {
      relations = res?.[0]?.$associations ?? {}
      relationsLoaded = true
    },
    { associations }
  )

  $: if (relationsLoaded) {
    dispatch('loaded')
  }
</script>

{#each associationsB as association (`${association._id}_b`)}
  <RelationEditor
    {association}
    {object}
    docs={relations[`${association._id}_b`] ?? []}
    {readonly}
    label={getEmbeddedLabel(association.nameB)}
    direction="B"
    {emptyKind}
  />
{/each}
{#each associationsA as association (`${association._id}_a`)}
  <RelationEditor
    {association}
    {object}
    docs={relations[`${association._id}_a`] ?? []}
    {readonly}
    label={getEmbeddedLabel(association.nameA)}
    direction="A"
    {emptyKind}
  />
{/each}
