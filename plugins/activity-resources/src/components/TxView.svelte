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
  import core, { Class, Doc, Ref, TxCUD, TxUpdateDoc } from '@anticrm/core'
  import { getResource, IntlString } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import {
    AnyComponent,
    AnySvelteComponent,
    Component,
    Icon,
    IconEdit,
    IconMoreH,
    Label,
    Menu,
    showPopup,
    TimeSince
  } from '@anticrm/ui'
  import type { Action, AttributeModel } from '@anticrm/view'
  import { buildModel, getActions, getObjectPresenter } from '@anticrm/view-resources'
  import { activityKey, ActivityKey, DisplayTx } from '../activity'
  import ShowMore from './ShowMore.svelte'

  export let tx: DisplayTx
  export let viewlets: Map<ActivityKey, TxViewlet>

  type TxDisplayViewlet =
    | (Pick<TxViewlet, 'icon' | 'label' | 'display' | 'editable' | 'hideOnRemove'> & {
        component?: AnyComponent | AnySvelteComponent
      })
    | undefined

  let ptx: DisplayTx | undefined

  let viewlet: TxDisplayViewlet | undefined
  let props: any
  let employee: EmployeeAccount | undefined
  let model: AttributeModel[] = []
  let actions: Action[] = []

  let edit = false

  $: if (tx.tx._id !== ptx?.tx._id) {
    viewlet = undefined
    props = undefined
    employee = undefined
    model = []
    ptx = tx
  }

  const client = getClient()

  async function createPseudoViewlet (dtx: DisplayTx, label: string): Promise<TxDisplayViewlet> {
    const doc = dtx.doc
    if (doc === undefined) {
      return
    }
    const docClass: Class<Doc> = client.getModel().getObject(doc._class)

    const presenter = await getObjectPresenter(client, doc._class, 'doc-presenter')
    if (presenter !== undefined) {
      return {
        display: 'inline',
        icon: docClass.icon ?? activity.icon.Activity,
        label: (`${label} ` + docClass.label) as IntlString,
        component: presenter.presenter
      }
    }
  }

  async function updateViewlet (dtx: DisplayTx): Promise<{ viewlet: TxDisplayViewlet; id: Ref<TxCUD<Doc>> }> {
    const key = activityKey(dtx.tx.objectClass, dtx.tx._class)
    let viewlet: TxDisplayViewlet = viewlets.get(key)

    props = { tx: dtx.tx, value: dtx.doc, edit }

    if (viewlet === undefined && dtx.tx._class === core.class.TxCreateDoc) {
      // Check if we have a class presenter we could have a pseudo viewlet based on class presenter.
      viewlet = await createPseudoViewlet(dtx, 'created')
    }
    if (viewlet === undefined && dtx.tx._class === core.class.TxRemoveDoc) {
      viewlet = await createPseudoViewlet(dtx, 'deleted')
    }
    return { viewlet, id: dtx.tx._id }
  }

  $: updateViewlet(tx).then((result) => {
    if (result.id === tx.tx._id) {
      viewlet = result.viewlet
    }
  })

  $: client
    .findOne(contact.class.EmployeeAccount, { _id: tx.tx.modifiedBy as Ref<EmployeeAccount> })
    .then((account) => {
      employee = account
    })

  $: if (tx.updateTx !== undefined) {
    const ops = {
      client,
      _class: tx.updateTx.objectClass,
      keys: Object.keys(tx.updateTx.operations).filter((id) => !id.startsWith('$')),
      ignoreMissing: true
    }
    buildModel(ops).then((m) => {
      model = m
    })
  }

  $: getActions(client, tx.tx.objectClass).then((result) => {
    actions = result
  })

  function getValue (utx: TxUpdateDoc<Doc>, key: string): any {
    return (utx.operations as any)[key]
  }
  const showMenu = async (ev: MouseEvent): Promise<void> => {
    showPopup(
      Menu,
      {
        actions: [
          {
            label: activity.string.Edit,
            icon: IconEdit,
            action: () => {
              edit = true
              props = { ...props, edit }
            }
          },
          ...actions.map((a) => ({
            label: a.label,
            icon: a.icon,
            action: async () => {
              const impl = await getResource(a.action)
              await impl(tx.doc as Doc)
            }
          }))
        ]
      },
      ev.target as HTMLElement
    )
  }
  const onCancelEdit = () => {
    edit = false
    props = { ...props, edit }
  }
</script>

{#if (viewlet !== undefined && !((viewlet?.hideOnRemove ?? false) && tx.removed)) || model.length > 0}
  <div class="flex-between msgactivity-container">

    <div class="flex-center icon">
      <div class="scale-75">
        {#if viewlet}
          <Icon icon={viewlet.icon} size="medium" />
        {:else}
          <Icon icon={activity.icon.Activity} size="medium" />
        {/if}
      </div>
    </div>

    <div class="flex-grow flex-col">

      <div class="flex-between">
        <div class="flex-grow label">
          <div class="bold">
            {#if employee}
              {formatName(employee.name)}
            {:else}
              No employee
            {/if}
          </div>
          {#if viewlet && viewlet?.editable}
            <div class="edited">
              {#if viewlet.label}
                <Label label={viewlet.label} />
              {/if}
              {#if tx.updated}
                <Label label={activity.string.Edited} />
              {/if}
              <div class="menuOptions" on:click={(ev) => showMenu(ev)}>
                <IconMoreH size={'medium'} />
              </div>
            </div>
          {:else if viewlet && viewlet.label}
            <div>
              <Label label={viewlet.label} />
            </div>
          {/if}
          {#if viewlet === undefined && model.length > 0 && tx.updateTx}
            {#each model as m}
              <span>changed {m.label} to</span>
              <div class="strong"><svelte:component this={m.presenter} value={getValue(tx.updateTx, m.key)} /></div>
            {/each}
          {:else if viewlet && viewlet.display === 'inline' && viewlet.component}
            <div>
              {#if typeof viewlet.component === 'string'}
                <Component is={viewlet.component} {props} on:close={onCancelEdit} />
              {:else}
                <svelte:component this={viewlet.component} {...props} on:close={onCancelEdit} />
              {/if}
            </div>
          {/if}
        </div>
        <div class="time"><TimeSince value={tx.tx.modifiedOn} /></div>    
      </div>

      {#if viewlet && viewlet.component && viewlet.display !== 'inline'}
        <div class={viewlet.display}>
          <ShowMore ignore={viewlet.display !== 'content' || edit}>
            {#if typeof viewlet.component === 'string'}
              <Component is={viewlet.component} {props} on:close={onCancelEdit} />
            {:else}
              <svelte:component this={viewlet.component} {...props} on:close={onCancelEdit} />
            {/if}
          </ShowMore>
        </div>
      {/if}
    </div>
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

  .menuOptions {
    margin-left: .5rem;
    opacity: .6;
    cursor: pointer;
    &:hover { opacity: 1; }
  }
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

  .edited {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
  }

  .label {
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    & > * { margin-right: .5rem; }
    & > *:last-child { margin-right: 0; }
    .bold {
      font-weight: 500;
      color: var(--theme-caption-color);
    }
    .strong {
      font-weight: 500;
      color: var(--theme-content-accent-color);
    }
  }

  .time {
    margin-left: 1rem;
    color: var(--theme-content-trans-color);
  }

  .content {
    flex-shrink: 0;
    margin-top: .5rem;
  }

  .emphasized {
    margin-top: .5rem;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;
    padding: 1rem 1.25rem;
  }
</style>
