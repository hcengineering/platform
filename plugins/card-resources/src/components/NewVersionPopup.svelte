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
  import { cardId, Card as CardType } from '@hcengineering/card'
  import core from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { getCurrentLocation, Label, navigate, Toggle } from '@hcengineering/ui'
  import plugin from '../plugin'
  import { createNewVersion } from '../utils'

  export let value: CardType

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const ancestors = hierarchy.getAncestors(value._class)
  const mixins = hierarchy.findAllMixins(value)

  const targets = new Set([...ancestors, ...mixins])
  const associations = client.getModel().findAllSync(core.class.Association, {})
  const relationsA = associations.filter((it) => targets.has(it.classB))
  const relationsB = associations.filter((it) => targets.has(it.classA))

  let relationsToCopy = new Set<string>([
    ...relationsA.map((p) => `${p._id}_a`),
    ...relationsB.map((p) => `${p._id}_b`)
  ])

  async function create (): Promise<void> {
    const _id = await createNewVersion(value, relationsToCopy)
    const loc = getCurrentLocation()
    loc.path[2] = cardId
    loc.path[3] = _id
    navigate(loc)
  }
</script>

<Card label={plugin.string.NewVersion} canSave={true} width={'small'} okAction={create} on:close>
  <div class="flex-col flex-gap-2">
    <Label label={plugin.string.NewVersionConfirmation} />
    {#if relationsA.length > 0 || relationsB.length > 0}
      <div>
        <Label label={plugin.string.RelationCopyDescr} />
      </div>
      <div class="grid">
        {#each relationsB as assoc}
          {@const id = `${assoc._id}_b`}
          <span>{assoc.nameB}</span>
          <Toggle
            on={relationsToCopy.has(id)}
            on:change={(e) => {
              if (e.detail === true) {
                relationsToCopy.add(id)
              } else {
                relationsToCopy.delete(id)
              }
              relationsToCopy = relationsToCopy
            }}
          />
        {/each}
        {#each relationsA as assoc}
          {@const id = `${assoc._id}_a`}
          <span>{assoc.nameA}</span>
          <Toggle
            on={relationsToCopy.has(id)}
            on:change={(e) => {
              if (e.detail === true) {
                relationsToCopy.add(id)
              } else {
                relationsToCopy.delete(id)
              }
              relationsToCopy = relationsToCopy
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
