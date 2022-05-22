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
  import core, { AnyAttribute, Doc, getCurrentAccount, Ref } from '@anticrm/core'
  import { Asset, getResource } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import {
    Component,
    Icon,
    IconEdit,
    IconMoreH,
    Label,
    Menu,
    ShowMore,
    showPopup,
    TimeSince,
    Button
  } from '@anticrm/ui'
  import type { AttributeModel } from '@anticrm/view'
  import { getActions } from '@anticrm/view-resources'
  import { ActivityKey, DisplayTx } from '../activity'
  import activity from '../plugin'
  import TxViewTx from './TxViewTx.svelte'
  import { getValue, TxDisplayViewlet, updateViewlet } from './utils'

  export let tx: DisplayTx
  export let viewlets: Map<ActivityKey, TxViewlet>
  export let showIcon: boolean = true

  let ptx: DisplayTx | undefined

  let viewlet: TxDisplayViewlet | undefined
  let props: any
  let employee: EmployeeAccount | undefined
  let model: AttributeModel[] = []
  let modelIcon: Asset | undefined = undefined

  let edit = false

  $: if (tx.tx._id !== ptx?.tx._id) {
    viewlet = undefined
    props = undefined
    employee = undefined
    model = []
    ptx = tx
  }

  const client = getClient()

  function getProps (props: any, edit: boolean): any {
    return { ...props, edit }
  }

  $: updateViewlet(client, viewlets, tx).then((result) => {
    if (result.id === tx.tx._id) {
      viewlet = result.viewlet
      model = result.model
      modelIcon = result.modelIcon
      props = getProps(result.props, edit)
    }
  })

  $: client
    .findOne(contact.class.EmployeeAccount, { _id: tx.tx.modifiedBy as Ref<EmployeeAccount> })
    .then((account) => {
      employee = account
    })

  const showMenu = async (ev: MouseEvent): Promise<void> => {
    const actions = await getActions(client, tx.doc as Doc)
    showPopup(
      Menu,
      {
        actions: [
          {
            label: activity.string.Edit,
            icon: IconEdit,
            action: () => {
              edit = true
              props = getProps(props, edit)
            }
          },
          ...actions.map((a) => ({
            label: a.label,
            icon: a.icon,
            action: async (ctx: any, evt: Event) => {
              const impl = await getResource(a.action)
              await impl(tx.doc as Doc, evt)
            }
          }))
        ]
      },
      ev.target as HTMLElement
    )
  }
  const onCancelEdit = () => {
    edit = false
    props = getProps(props, edit)
  }
  function isMessageType (attr?: AnyAttribute): boolean {
    return attr?.type._class === core.class.TypeMarkup
  }

  $: hasMessageType = model.find((m) => isMessageType(m.attribute))
</script>

{#if (viewlet !== undefined && !((viewlet?.hideOnRemove ?? false) && tx.removed)) || model.length > 0}
  <div class="flex-between msgactivity-container" class:showIcon>
    {#if showIcon}
      <div class="flex-center icon">
        {#if viewlet}
          <Icon icon={viewlet.icon} size="small" />
        {:else if viewlet === undefined && model.length > 0}
          <Icon icon={modelIcon !== undefined ? modelIcon : IconEdit} size="small" />
        {:else}
          <Icon icon={activity.icon.Activity} size="small" />
        {/if}
      </div>
    {/if}

    <div class="flex-grow flex-col clear-mins">
      <div class="flex-between">
        <div class="flex-grow label">
          <div class="bold">
            {#if employee}
              {formatName(employee.name)}
            {:else}
              <Label label={activity.string.System} />
            {/if}
          </div>
          {#if viewlet && viewlet?.editable}
            <div class="buttons-group small-gap">
              {#if viewlet.label}
                <Label label={viewlet.label} params={viewlet.labelParams ?? {}} />
              {/if}
              {#if tx.updated}
                <Label label={activity.string.Edited} />
              {/if}
              {#if tx.tx.modifiedBy === getCurrentAccount()._id}
                <Button
                  icon={IconMoreH}
                  kind={'transparent'}
                  shape={'circle'}
                  size={'medium'}
                  on:click={(ev) => showMenu(ev)}
                />
              {/if}
            </div>
          {:else if viewlet && viewlet.label}
            <div class="flex-center">
              <span class="lower">
                <Label label={viewlet.label} params={viewlet.labelParams ?? {}} />
              </span>
              {#if viewlet.labelComponent}
                <Component is={viewlet.labelComponent} {props} />
              {/if}
            </div>
          {/if}
          {#if viewlet === undefined && model.length > 0 && tx.updateTx}
            {#each model as m, i}
              {#await getValue(client, m, tx) then value}
                {#if value.set === null}
                  <span class="lower"><Label label={activity.string.Unset} /> <Label label={m.label} /></span>
                {:else if value.added.length}
                  <span class="lower" class:flex-grow={hasMessageType}>
                    <Label label={activity.string.Added} />
                    <Label label={activity.string.To} />
                    <Label label={m.label} />
                  </span>
                  <div class="strong">
                    <div class="flex">
                      {#each value.added as value}
                        <svelte:component this={m.presenter} {value} />
                      {/each}
                    </div>
                  </div>
                {:else if value.removed.length}
                  <span class="lower" class:flex-grow={hasMessageType}>
                    <Label label={activity.string.Removed} />
                    <Label label={activity.string.From} />
                    <Label label={m.label} />
                  </span>
                  <div class="strong">
                    <div class="flex">
                      {#each value.removed as value}
                        <svelte:component this={m.presenter} {value} />
                      {/each}
                    </div>
                  </div>
                {:else}
                  <span class="lower" class:flex-grow={hasMessageType}>
                    <Label label={activity.string.Changed} />
                    <Label label={m.label} />
                    <Label label={activity.string.To} />
                  </span>
                  {#if hasMessageType}
                    <div class="time"><TimeSince value={tx.tx.modifiedOn} /></div>
                  {/if}
                  {#if isMessageType(m.attribute)}
                    <div class="strong message emphasized">
                      <svelte:component this={m.presenter} value={value.set} />
                    </div>
                  {:else}
                    <div class="strong">
                      <svelte:component this={m.presenter} value={value.set} />
                    </div>
                  {/if}
                {/if}
              {/await}
            {/each}
          {:else if viewlet === undefined && model.length > 0 && tx.mixinTx}
            {#each model as m}
              {#await getValue(client, m, tx) then value}
                {#if value.set === null}
                  <span>
                    <Label label={activity.string.Unset} /> <span class="lower"><Label label={m.label} /></span>
                  </span>
                {:else}
                  <span>
                    <Label label={activity.string.Changed} />
                    <span class="lower"><Label label={m.label} /></span>
                    <Label label={activity.string.To} />
                  </span>
                  {#if isMessageType(m.attribute)}
                    <div class="strong message emphasized">
                      <svelte:component this={m.presenter} value={value.set} />
                    </div>
                  {:else}
                    <div class="strong">
                      <svelte:component this={m.presenter} value={value.set} />
                    </div>
                  {/if}
                {/if}
              {/await}
            {/each}
          {:else if viewlet && viewlet.display === 'inline' && viewlet.component}
            {#if tx.collectionAttribute !== undefined && (tx.txDocIds?.size ?? 0) > 1}
              <ShowMore ignore={edit}>
                <div class="flex-row-center flex-grow flex-wrap clear-mins">
                  <TxViewTx {tx} {onCancelEdit} {edit} {viewlet} />
                </div>
              </ShowMore>
            {:else if typeof viewlet.component === 'string'}
              <Component is={viewlet.component} {props} on:close={onCancelEdit} />
            {:else}
              <svelte:component this={viewlet.component} {...props} on:close={onCancelEdit} />
            {/if}
          {/if}
        </div>
        {#if !hasMessageType}
          <div class="time"><TimeSince value={tx.tx.modifiedOn} /></div>
        {/if}
      </div>

      {#if viewlet && viewlet.component && viewlet.display !== 'inline'}
        <div class={viewlet.display}>
          <ShowMore ignore={edit}>
            {#if tx.collectionAttribute !== undefined && (tx.txDocIds?.size ?? 0) > 1}
              <div class="flex-row-center flex-grow flex-wrap clear-mins">
                <TxViewTx {tx} {onCancelEdit} {edit} {viewlet} />
              </div>
            {:else if typeof viewlet.component === 'string'}
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
    min-width: 0;
  }

  .showIcon {
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

  .menuOptions {
    margin-left: 0.5rem;
    opacity: 0.8;
    cursor: pointer;
    &:hover {
      opacity: 1;
    }
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

  .time {
    align-self: baseline;
    margin-left: 1rem;
    color: var(--theme-content-trans-color);
  }

  .content {
    flex-shrink: 0;
    margin-top: 0.5rem;
    min-width: 0;
    min-height: 0;
  }

  .emphasized {
    margin-top: 0.5rem;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
  }

  .message {
    flex-basis: 100%;
  }
</style>
