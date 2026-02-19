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
  import card from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Process, Step } from '@hcengineering/process'
  import { DropdownLabels, DropdownTextItem, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let process: Process
  export let step: Step<Process>

  const dispatch = createEventDispatcher()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  const params = step.params
  let _id = params._id as Ref<Process>

  function change (e: CustomEvent): void {
    if (e.detail !== undefined) {
      _id = e.detail
      params._id = _id
      step.params = params
      dispatch('change', step)
    }
  }

  let processes: Process[] = []
  let items: DropdownTextItem[] = []

  $: items = processes.map((it) => ({
    id: it._id,
    label: it.name
  }))

  $: ancestors = hierarchy.getAncestors(process.masterTag).filter((it) => hierarchy.isDerived(it, card.class.Card))

  $: selected = _id !== undefined ? items.find((it) => it.id === _id)?.id : undefined

  $: processes = client
    .getModel()
    .findAllSync(plugin.class.Process, { masterTag: { $in: ancestors }, _id: { $ne: process._id } })
</script>

<div class="editor-grid">
  <Label label={plugin.string.Process} />
  <DropdownLabels
    autoSelect={false}
    enableSearch={false}
    width={'100%'}
    {items}
    {selected}
    placeholder={plugin.string.Process}
    on:selected={change}
  />
</div>
