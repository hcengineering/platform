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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import core, { Association, Doc, Ref } from '@hcengineering/core'
  import RelationEditor from './RelationEditor.svelte'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  export let object: Doc
  export let readonly: boolean = false

  const client = getClient()
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

  let relationsA: Record<Ref<Association>, Doc[]> = {}
  let relationsB: Record<Ref<Association>, Doc[]> = {}

  const queryA = createQuery()
  $: queryA.query(
    object._class,
    { _id: object._id },
    (res) => {
      relationsA = res[0].$associations ?? {}
    },
    { associations: associationsA.map((a) => [a._id, 1]) }
  )

  const queryB = createQuery()
  $: queryB.query(
    object._class,
    { _id: object._id },
    (res) => {
      relationsB = res[0].$associations ?? {}
    },
    { associations: associationsB.map((a) => [a._id, -1]) }
  )
</script>

{#each associationsB as association (association._id)}
  <RelationEditor
    {association}
    {object}
    docs={relationsB[association._id] ?? []}
    {readonly}
    label={getEmbeddedLabel(association.nameB)}
    direction="B"
  />
{/each}
{#each associationsA as association (association._id)}
  <RelationEditor
    {association}
    {object}
    docs={relationsA[association._id] ?? []}
    {readonly}
    label={getEmbeddedLabel(association.nameA)}
    direction="A"
  />
{/each}
