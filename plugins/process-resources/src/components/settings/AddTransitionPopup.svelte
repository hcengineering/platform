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
  import core, { Ref } from '@hcengineering/core'
  import { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { Process, State, Trigger } from '@hcengineering/process'
  import { Component, Dropdown, DropdownIntlItem, DropdownLabelsIntl, Label, ListItem } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let process: Process

  const dispatch = createEventDispatcher()
  let to: Ref<State> | undefined = undefined
  let states: State[] = []

  const query = createQuery()
  query.query(plugin.class.State, { process: process._id }, (res) => {
    states = res
  })

  let statesItems: ListItem[] = []

  $: statesItems = states.map((s) => ({ label: s.title, _id: s._id }))

  let selectedState: ListItem | undefined

  $: to = selectedState?._id as Ref<State>

  let fromState: ListItem | undefined

  $: from = (fromState?._id as Ref<State>) ?? null

  const client = getClient()
  const withoutFrom =
    client.getModel().findAllSync(plugin.class.Transition, { from: null, process: process._id })[0] === undefined

  const triggers = client.getModel().findAllSync(plugin.class.Trigger, { init: withoutFrom })
  let trigger: Ref<Trigger> = triggers[0]._id

  $: triggerValue = triggers.find((t) => t._id === trigger)

  let params: Record<string, any> = {}

  const triggersItems: DropdownIntlItem[] = triggers.map((p) => ({ label: p.label, id: p._id, icon: p.icon }))

  async function save (): Promise<void> {
    if (to === undefined || trigger === undefined) {
      return
    }
    await client.createDoc(plugin.class.Transition, core.space.Model, {
      from,
      to,
      trigger,
      triggerParams: params,
      process: process._id,
      actions: []
    })
    dispatch('close')
  }

  function change (e: CustomEvent<Record<string, any>>): void {
    params = e.detail
  }
</script>

<Card
  okAction={save}
  canSave={to !== undefined && trigger !== undefined && to !== from}
  label={plugin.string.AddTransition}
  width={'medium'}
  on:close
>
  <div class="grid">
    <Label label={plugin.string.From} />
    {#if !withoutFrom}
      <Dropdown
        items={statesItems}
        bind:selected={fromState}
        placeholder={plugin.string.From}
        justify={'left'}
        width={'100%'}
        kind={'no-border'}
      />
    {:else}
      <div>⦳</div>
    {/if}
    <Label label={plugin.string.To} />
    <Dropdown
      items={statesItems}
      bind:selected={selectedState}
      placeholder={plugin.string.To}
      justify={'left'}
      width={'100%'}
      kind={'no-border'}
    />
    <Label label={plugin.string.Trigger} />
    <DropdownLabelsIntl
      items={triggersItems}
      bind:selected={trigger}
      label={plugin.string.Trigger}
      justify={'left'}
      width={'100%'}
      kind={'no-border'}
    />
  </div>
  {#if triggerValue?.editor}
    <Component is={triggerValue.editor} props={{ process, params }} on:change={change} />
  {/if}
</Card>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 3fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 1rem;
    height: min-content;
  }
</style>
