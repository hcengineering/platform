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
  import activity from '@anticrm/activity'
  import contact, { EmployeeAccount, formatName } from '@anticrm/contact'
  import core, {
    AttachedDoc,
    Doc,
    Ref,
    Tx,
    TxCollectionCUD,
    TxCreateDoc,
    TxCUD,
    TxProcessor,
    TxUpdateDoc
  } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { AnyComponent, AnySvelteComponent, Component, Icon, Label, TimeSince } from '@anticrm/ui'
  import type { AttributeModel } from '@anticrm/view'
  import { buildModel, getObjectPresenter } from '@anticrm/view-resources'
  import { activityKey, ActivityKey } from '../utils'

  export let tx: Tx
  export let viewlets: Map<ActivityKey, TxViewlet>

  type TxDisplayViewlet =
    | (Pick<TxViewlet, 'icon' | 'label' | 'display'> & { component?: AnyComponent | AnySvelteComponent })
    | undefined

  let viewlet: TxDisplayViewlet
  let props: any
  let displayTx: TxCUD<Doc> | undefined
  let utx: TxUpdateDoc<Doc> | undefined

  const client = getClient()

  $: if (client.getHierarchy().isDerived(tx._class, core.class.TxCollectionCUD)) {
    const colCUD = tx as TxCollectionCUD<Doc, AttachedDoc>
    displayTx = colCUD.tx
    viewlet = undefined
  } else if (client.getHierarchy().isDerived(tx._class, core.class.TxCUD)) {
    displayTx = tx as TxCUD<Doc>
    viewlet = undefined
  }

  async function updateViewlet (displayTx?: TxCUD<Doc>): Promise<TxDisplayViewlet> {
    if (displayTx === undefined) {
      return undefined
    }
    const key = activityKey(displayTx.objectClass, displayTx._class)
    let viewlet: TxDisplayViewlet = viewlets.get(key)

    props = { tx: displayTx }

    if (viewlet === undefined && displayTx._class === core.class.TxCreateDoc) {
      // Check if we have a class presenter we could have a pseudo viewlet based on class presenter.
      const doc = TxProcessor.createDoc2Doc(displayTx as TxCreateDoc<Doc>)
      const docClass = client.getModel().getObject(doc._class)

      const presenter = await getObjectPresenter(client, doc._class, 'doc-presenter')
      if (presenter !== undefined) {
        viewlet = {
          display: 'inline',
          icon: docClass.icon ?? activity.icon.Activity,
          label: ('created ' + docClass.label) as IntlString,
          component: presenter.presenter
        }
        props = { value: doc }
      }
    }
    return viewlet
  }

  $: updateViewlet(displayTx).then((result) => {
    viewlet = result
  })

  let employee: EmployeeAccount | undefined
  $: client.findOne(contact.class.EmployeeAccount, { _id: tx.modifiedBy as Ref<EmployeeAccount> }).then((account) => {
    employee = account
  })

  let model: AttributeModel[] = []

  $: if (displayTx !== undefined && displayTx._class === core.class.TxUpdateDoc) {
    utx = displayTx as TxUpdateDoc<Doc>
    const ops = { client, _class: utx.objectClass, keys: Object.keys(utx.operations), ignoreMissing: true }
    model = []
    buildModel(ops).then((m) => {
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
            <Icon icon={viewlet.icon} size="medium" />
          {:else}
            <Icon icon={activity.icon.Activity} size="medium" />
          {/if}
        </div>
      </div>
      <div class="flex-grow label">
        <div class="bold">
          {#if employee}
            {formatName(employee.name)}
          {:else}
            No employee
          {/if}
        </div>
        {#if viewlet && viewlet.label}
          <div><Label label={viewlet.label} /></div>
        {/if}
        {#if viewlet === undefined && model.length > 0 && utx}
          {#each model as m}
            <span>changed {m.label} to</span>
            <div class="strong"><svelte:component this={m.presenter} value={getValue(utx, m.key)} /></div>
          {/each}
        {:else if viewlet && viewlet.display === 'inline' && viewlet.component}
          <div>
            {#if typeof viewlet.component === 'string'}
              <Component is={viewlet.component} {props} />
            {:else}
              <svelte:component this={viewlet.component} {...props} />
            {/if}
          </div>
        {/if}
      </div>
      <div class="time"><TimeSince value={tx.modifiedOn} /></div>
    </div>
    {#if viewlet && viewlet.component && viewlet.display !== 'inline'}
      <div class="content" class:emphasize={viewlet.display === 'emphasized'}>
        {#if typeof viewlet.component === 'string'}
          <Component is={viewlet.component} {props} />
        {:else}
          <svelte:component this={viewlet.component} {...props} />
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .msgactivity-container {
    position: relative;
    &::after,
    &::before {
      position: absolute;
      left: 1.125rem;
      width: 1px;
      background-color: var(--theme-card-divider);
    }
    &::before {
      top: -1.5rem;
      height: 1.5rem;
    }
    &::after {
      content: '';
      top: 2.25rem;
      bottom: 0;
    }
  }
  :global(.msgactivity-container + .msgactivity-container::before) {
    content: '';
  }
  // :global(.msgactivity-container > *:last-child::after) { content: none; }

  .icon {
    flex-shrink: 0;
    align-self: flex-start;
    margin-right: 1rem;
    width: 2.25rem;
    height: 2.25rem;
    color: var(--theme-caption-color);
    border: 1px solid var(--theme-card-divider);
    border-radius: 50%;
  }

  .content {
    margin: 0.5rem 0 0.5rem 3.25rem;
  }
  .emphasize {
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  .time {
    margin-left: 1rem;
    color: var(--theme-content-trans-color);
  }

  .label {
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    & > * {
      margin-right: 0.5rem;
    }
    & > *:last-child {
      margin-right: 0;
    }
    .bold {
      font-weight: 500;
      color: var(--theme-caption-color);
    }
    .strong {
      font-weight: 500;
      color: var(--theme-content-accent-color);
    }
  }
</style>
