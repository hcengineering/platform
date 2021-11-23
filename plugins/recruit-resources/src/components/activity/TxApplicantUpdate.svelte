<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import type { Class, State, TxUpdateDoc } from '@anticrm/core'
  import core from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import type { Applicant } from '@anticrm/recruit'
  import { Component } from '@anticrm/ui'
  import view from '@anticrm/view'

  export let tx: TxUpdateDoc<Applicant>

  const client = getClient()

  const stateClass = client.getModel().getObject(core.class.State) as Class<State>
  const statePresenter = client.getHierarchy().as(stateClass, view.mixin.AttributePresenter)

</script>
  
{#if tx.operations.state}
  <div class="flex-row-center update-container">
    <span>updated State to</span>
    {#if statePresenter?.presenter}
      {#await client.findOne(core.class.State, { _id: tx.operations.state }) then st}
        {#if st}
          <Component is={statePresenter.presenter} props={{ value: st }}/>
        {/if}
      {/await}
    {/if}
  </div>
{/if}

<style lang="scss">
  .update-container span { margin-right: .5rem; }
</style>
