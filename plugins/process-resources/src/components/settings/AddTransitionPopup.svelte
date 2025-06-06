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
  import { State, Trigger } from '@hcengineering/process'
  import { Dropdown, DropdownIntlItem, DropdownLabelsIntl, Grid, Label, ListItem, Toggle } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let state: State
  export let direction: 'from' | 'to'
  const dispatch = createEventDispatcher()
  let target: Ref<State> | null | undefined = undefined
  let states: State[] = []

  const query = createQuery()
  query.query(plugin.class.State, { process: state.process }, (res) => {
    states = res.filter((s) => s._id !== state._id)
  })

  let statesItems: ListItem[] = []

  $: statesItems = states.map((s) => ({ label: s.title, _id: s._id }))

  let selectedState: ListItem | undefined

  $: target = selectedState?._id === 'rollback' ? null : (selectedState?._id as Ref<State>)

  const client = getClient()
  const triggers = client.getModel().findAllSync(plugin.class.Trigger, {})
  let trigger: Ref<Trigger> = triggers[0]._id

  const triggersItems: DropdownIntlItem[] = triggers.map((p) => ({ label: p.label, id: p._id, icon: p.icon }))

  async function save (): Promise<void> {
    if (target === undefined || trigger === undefined) {
      return
    }
    const from = direction === 'from' ? state._id : (target as Ref<State>)
    const to = direction === 'from' ? target : state._id
    await client.createDoc(plugin.class.Transition, core.space.Model, {
      from,
      to,
      trigger,
      triggerParams: {},
      process: state.process,
      actions: []
    })
    dispatch('close')
  }
</script>

<Card
  okAction={save}
  canSave={target !== undefined && trigger !== undefined}
  label={plugin.string.AddTransition}
  width={'medium'}
  on:close
>
  <Grid rowGap={1} columnGap={0.5}>
    <Label label={plugin.string.Trigger} />
    <DropdownLabelsIntl
      items={triggersItems}
      bind:selected={trigger}
      label={plugin.string.Trigger}
      justify={'left'}
      width={'100%'}
      kind={'regular'}
    />
    <Label label={plugin.string.Rollback} />
    <Toggle
      on={target === null}
      on:change={(e) => {
        if (e.detail) {
          target = null
        } else {
          target = undefined
        }
      }}
    />
    {#if target !== null}
      <Label label={direction === 'from' ? plugin.string.From : plugin.string.To} />
      <Dropdown
        items={statesItems}
        bind:selected={selectedState}
        placeholder={direction === 'from' ? plugin.string.From : plugin.string.To}
        justify={'left'}
        width={'100%'}
        kind={'regular'}
      />
    {/if}
  </Grid>
</Card>
