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
  import card from '@hcengineering/card'
  import { getClient } from '@hcengineering/presentation'
  import { Execution, parseContext, Process, Step } from '@hcengineering/process'
  import { DropdownLabels, DropdownTextItem, Label, Toggle } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { getContextMasterTag } from '../../utils'
  import ProcessAttributeEditor from './ProcessAttributeEditor.svelte'

  export let process: Process
  export let step: Step<Execution>

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let _id = step.params._id
  $: context = parseContext(step.params.card)
  $: masterTag = getContextMasterTag(client, context, process.masterTag) ?? process.masterTag

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      ;(step.params as any)._id = e.detail
      dispatch('change', step)
    }
  }

  let thisCard: boolean = step.params.card === undefined

  $: ancestors = hierarchy
    .getAncestors(masterTag)
    .filter((it) => !hierarchy.isMixin(it) && hierarchy.isDerived(it, card.class.Card))

  let processes: Process[] = []
  let items: DropdownTextItem[] = []

  $: items = processes.map((it) => ({
    id: it._id,
    label: it.name
  }))

  $: selected = _id !== undefined ? items.find((it) => it.id === _id)?.id : undefined

  $: processes = client
    .getModel()
    .findAllSync(plugin.class.Process, { masterTag: { $in: ancestors }, _id: { $ne: process._id } })

  function changeThis (): void {
    _id = undefined
    step.params = {}
    dispatch('change', step)
  }

  function changeTarget (e: CustomEvent<any>): void {
    _id = undefined
    step.params.card = e.detail.value
  }
</script>

<div class="grid">
  <Label label={plugin.string.CurrentCard} />
  <Toggle bind:on={thisCard} on:change={changeThis} />
  {#if !thisCard}
    <ProcessAttributeEditor
      {process}
      _class={plugin.class.Execution}
      key={'card'}
      object={step.params}
      allowRemove
      allowArray
      forbidValue
      on:remove={() => {
        thisCard = true
        changeThis()
      }}
      on:change={changeTarget}
    />
  {/if}
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
