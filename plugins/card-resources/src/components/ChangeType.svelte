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
  import { Analytics } from '@hcengineering/analytics'
  import { Card, CardEvents, MasterTag } from '@hcengineering/card'
  import { AnyAttribute, fillDefaults, Ref } from '@hcengineering/core'
  import { Card as CardModal, getClient } from '@hcengineering/presentation'
  import ui, { Label } from '@hcengineering/ui'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'
  import card from '../plugin'
  import TypeSelector from './TypeSelector.svelte'

  export let value: Card

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let selected: Ref<MasterTag> = value._class

  $: mapping = buildMapping(selected, value._class)

  async function changeType (): Promise<void> {
    if (selected === undefined || selected === value._class) return
    const cloned = hierarchy.clone(value)
    applyMapping(cloned, mapping)
    const update = fillDefaults(hierarchy, cloned, selected)
    const ops = client.apply('changeType', 'ChangeType')
    await ops.update(value, { _class: selected } as any)
    if (Object.keys(update).length > 0) {
      await ops.diffUpdate(value, update)
    }
    await ops.commit()
    Analytics.handleEvent(CardEvents.TypeCreated)
  }

  function applyMapping (object: Card, mapping: Record<string, AnyAttribute>): void {
    for (const [key, value] of Object.entries(mapping)) {
      if ((object as any)[key] !== undefined) {
        ;(object as any)[value.name] = (object as any)[key]
      }
    }
  }

  function buildMapping (selected: Ref<MasterTag> | undefined, current: Ref<MasterTag>): Record<string, AnyAttribute> {
    if (selected === undefined || selected === current) return {}
    const selectedAttributes = hierarchy.getAllAttributes(selected, card.class.Card)
    const currentAttributes = hierarchy.getAllAttributes(current, card.class.Card)
    const res: Record<string, AnyAttribute> = {}
    for (const curr of currentAttributes) {
      // matched, don't need to do anything
      if ((selectedAttributes as any)[curr[0]] !== undefined) {
        res[curr[0]] = curr[1]
        continue
      }
      const selectedValues = [...selectedAttributes.values()]
      const matched = selectedValues.find((p) => p.label === curr[1].label && deepEqual(p.type, curr[1].type))
      if (matched !== undefined) {
        res[curr[0]] = matched
      }
    }
    return res
  }

  const dispatch = createEventDispatcher()
</script>

<CardModal
  label={card.string.ChangeType}
  okLabel={ui.string.Ok}
  okAction={changeType}
  canSave={selected !== undefined && selected !== value._class}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="mb-2">
    <Label label={card.string.ChangeTypeWarning} />
  </div>
  <TypeSelector bind:value={selected} />
</CardModal>
