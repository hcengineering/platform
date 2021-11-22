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
  import type { TxViewlet } from '@anticrm/activity'
  import contact, { EmployeeAccount, formatName } from '@anticrm/contact'
  import type { AttachedDoc, Doc, Ref, Tx, TxCollectionCUD, TxCUD, TxUpdateDoc } from '@anticrm/core'
  import core from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Component, Icon, Label, TimeSince } from '@anticrm/ui'
  import type { AttributeModel } from '@anticrm/view'
  import view, { BuildModelOptions } from '@anticrm/view'
  import { activityKey, ActivityKey } from '../utils'
  import activity from '@anticrm/activity'

  export let tx: Tx
  export let viewlets: Map<ActivityKey, TxViewlet>

  let viewlet: TxViewlet | undefined
  let displayTx: TxCUD<Doc> | undefined
  let utx: TxUpdateDoc<Doc> | undefined

  const client = getClient()

  $: if (client.getHierarchy().isDerived(tx._class, core.class.TxCollectionCUD)) {
    const colCUD = (tx as TxCollectionCUD<Doc, AttachedDoc>)
    displayTx = colCUD.tx
  } else if (client.getHierarchy().isDerived(tx._class, core.class.TxCUD)) {
    displayTx = tx as TxCUD<Doc>
  }

  $: if (displayTx !== undefined) {
    const key = activityKey(displayTx.objectClass, displayTx._class)
    viewlet = viewlets.get(key)
  } else {
    viewlet = undefined
  }

  let employee: EmployeeAccount | undefined
  $: client.findOne(contact.class.EmployeeAccount, { _id: tx.modifiedBy as Ref<EmployeeAccount> }).then(account => { employee = account })

  $: client.findAll(contact.class.EmployeeAccount, { }).then(accounts => { console.log(tx.modifiedBy, 'accounts', accounts) })
  let model: AttributeModel[] = []

  let buildModel: ((options: BuildModelOptions) => Promise<AttributeModel[]>)|undefined
  getResource(view.api.buildModel).then(bm => {
    buildModel = bm
  })

  $: if (displayTx !== undefined && displayTx._class === core.class.TxUpdateDoc) {
    utx = displayTx as TxUpdateDoc<Doc>
    const ops = { client, _class: utx.objectClass, keys: Object.keys(utx.operations), ignoreMissing: true }
    model = []
    buildModel?.(ops).then(m => {
      model = m
    })
  } else {
    model = []
    utx = undefined
  }

  function getValue (utx: TxUpdateDoc<Doc>, key: string): any {
    return (utx.operations as any)[key]
  }
</script>

{#if displayTx && (viewlet !== undefined || model.length > 0)}
  <div class="flex-col msgactivity-container">
    <div class="flex-between">      
        <div class="flex-center icon">
          <div class="scale-75">
            {#if viewlet}
              <Icon icon={viewlet.icon} size='medium'/>
            {:else}
              <Icon icon={activity.icon.Activity} size='medium'/>
            {/if}
          </div>
        </div>
      <div class="flex-grow label">
        <b>
          {#if employee}
            {formatName(employee.name)}          
          {:else}
            No employee
          {/if}
        </b> 
        {#if viewlet}
          <Label label={viewlet.label}/>
        {/if}
        {#if viewlet === undefined && model.length > 0 && utx}
          {#each model as m}
            changed {m.label} to 
            <strong><svelte:component this={m.presenter} value={getValue(utx, m.key)}/></strong>
          {/each}
        {:else if viewlet && viewlet.display === 'inline' && viewlet.component}
          <Component is={viewlet.component} props={{ tx: displayTx }} />
        {/if}
      </div>
      <div class="content-trans-color"><TimeSince value={tx.modifiedOn}/></div>
    </div>
    {#if viewlet && viewlet.component && viewlet.display !== 'inline'}
      <div class='content' class:emphasize={viewlet.display === 'emphasized'}>
        <Component is={viewlet.component} props={{ tx: displayTx }} />
      </div>
    {/if}
  </div>
{/if}
<style lang="scss">
  .msgactivity-container {
    position: relative;
    &::after {
      content: '';
      position: absolute;
      top: 2.25rem;
      left: 1.125rem;
      bottom: 0;
      width: 1px;
      background-color: var(--theme-card-divider);
    }
  }
  :global(.msgactivity-container + .msgactivity-container::before) {
    content: '';
    position: absolute;
    top: -1.5rem;
    left: 1.125rem;
    height: 1.5rem;
    width: 1px;
    background-color: var(--theme-card-divider);
  }

  .icon {
    flex-shrink: 0;
    align-self: flex-start;
    width: 2.25rem;
    height: 2.25rem;
    color: var(--theme-caption-color);
    border: 1px solid var(--theme-card-divider);
    border-radius: 50%;
  }

  .content {
    margin: 0.5rem 0 0.5rem 3.25rem;
    padding: 1rem;    
  }
  .emphasize {
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
  }

  .label {
    margin: 0 1rem;

    b { color: var(--theme-caption-color); }
    strong {
      font-weight: 500;
      color: var(--theme-content-accent-color);
    }
  }
</style>
