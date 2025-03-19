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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Process, Step } from '@hcengineering/process'
  import { DropdownLabels, DropdownTextItem, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'

  export let process: Process
  export let step: Step<Process>

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      ;(step.params as any)._id = e.detail
      dispatch('change', step)
    }
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  $: desc = hierarchy.getDescendants(process.masterTag).filter((it) => !hierarchy.isMixin(it))

  let processes: Process[] = []
  let items: DropdownTextItem[] = []

  $: items = processes.map((it) => ({
    id: it._id,
    label: it.name
  }))

  $: selected =
    (step.params as any)._id !== undefined ? items.find((it) => it.id === (step.params as any)._id)?.id : undefined

  const query = createQuery()

  $: query.query(plugin.class.Process, { masterTag: { $in: desc } }, (res) => {
    processes = res.filter((it) => it._id !== process._id)
  })
</script>

<div class="grid">
  <Label label={plugin.string.Process} />
  <DropdownLabels
    autoSelect={false}
    enableSearch={false}
    {items}
    {selected}
    placeholder={plugin.string.Process}
    on:selected={change}
  />
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.25rem;
    column-gap: 1rem;
    margin: 0.25rem 2rem 0;
    width: calc(100% - 4rem);
    height: min-content;
  }
</style>
