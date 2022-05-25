<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Card } from '@anticrm/board'
  import board from '@anticrm/board'
  import { Employee } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { CheckBox, Label } from '@anticrm/ui'

  import plugin from '../../plugin'
  import { updateCardMembers } from '../../utils/CardUtils'
  import UserBoxList from '../UserBoxList.svelte'
  import CardLabels from './CardLabels.svelte'

  export let value: Card
  const client = getClient()

  function updateMembers (e: CustomEvent<Ref<Employee>[]>) {
    updateCardMembers(value, client, e.detail)
  }
  function updateState (e: CustomEvent<boolean>) {
    if (e.detail) {
      client.update(value, { doneState: board.state.Completed })
    } else {
      client.update(value, { doneState: null })
    }
  }
</script>

{#if value}
  <div class="attributes-bar-container">
    <div class="label fs-bold">
      <Label label={plugin.string.Completed} />
    </div>
    <div class="ml-4">
      <CheckBox checked={value.doneState === board.state.Completed} on:value={updateState} />
    </div>
    <div class="label fs-bold">
      <Label label={plugin.string.Members} />
    </div>
    <div class="ml-4">
      <UserBoxList value={value.members ?? []} on:update={updateMembers} />
    </div>
    <div class="label fs-bold">
      <Label label={plugin.string.Labels} />
    </div>
    <div class="ml-4">
      <CardLabels {value} />
    </div>
  </div>
{/if}

<style lang="scss">
  .attributes-bar-container {
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-flow: row;
    justify-content: start;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
    width: 100%;
    height: min-content;
  }
</style>
