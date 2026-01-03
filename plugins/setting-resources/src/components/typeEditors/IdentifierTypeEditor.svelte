<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core, { Attribute, CustomSequence, IndexKind, Ref, Type, TypeIdentifier as TypeId } from '@hcengineering/core'
  import { TypeIdentifier } from '@hcengineering/model'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { EditBox, Label, Toggle } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import setting from '../../plugin'

  export let type: TypeId | undefined
  export let attribute: Attribute<TypeId> | undefined
  export let editable: boolean = true

  const dispatch = createEventDispatcher()
  const client = getClient()

  let seq: Ref<CustomSequence> | undefined = type?.of

  let identifier: string = ''
  let sequences: CustomSequence[] = []
  let showInPresenter = attribute?.showInPresenter ?? false

  $: identifiers = new Set(sequences.filter((p) => p._id !== seq).map((s) => s.prefix.toUpperCase()))

  const query = createQuery()
  query.query(core.class.CustomSequence, {}, (res) => {
    sequences = res
    identifier = seq ? (sequences.find((s) => s._id === seq)?.prefix ?? '') : ''
  })

  $: currentSequence = sequences.find((s) => s._id === seq)

  async function change () {
    if (identifiers.has(identifier.toUpperCase())) return
    if (identifier.toUpperCase() === (currentSequence?.prefix?.toUpperCase() ?? '')) return
    if (currentSequence !== undefined) {
      await client.update(currentSequence, { prefix: identifier.toUpperCase() })
    } else {
      if (!editable) return
      const newSeq = await client.createDoc(core.class.CustomSequence, core.space.Workspace, {
        prefix: identifier.toUpperCase(),
        sequence: 0,
        attachedTo: core.class.CustomSequence
      })
      seq = newSeq
      dispatch('change', { type: TypeIdentifier(newSeq), index: IndexKind.FullText, extra: { showInPresenter } })
    }
  }

  async function changeShowing () {
    if (seq === undefined) return
    const type = TypeIdentifier(seq)
    dispatch('change', { type, index: IndexKind.FullText, extra: { showInPresenter } })
  }
</script>

<span class="label">
  <Label label={core.string.Id} />
</span>
<div class="flex-row-center">
  <EditBox bind:value={identifier} placeholder={core.string.Id} uppercase maxWidth={'50%'} on:change={change} />
  {#if editable && identifiers.has(identifier.toUpperCase())}
    <div class="overflow-label duplicated-identifier">
      <Label label={setting.string.IdentifierExists} />
    </div>
  {/if}
</div>
<span class="label">
  <Label label={setting.string.ShowInTitle} />
</span>
<Toggle bind:on={showInPresenter} on:change={changeShowing} />

<style lang="scss">
  .duplicated-identifier {
    color: var(--theme-warning-color);
  }
</style>
