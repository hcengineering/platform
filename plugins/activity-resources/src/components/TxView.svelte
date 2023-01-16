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
  import type { TxViewlet } from '@hcengineering/activity'
  import contact, { EmployeeAccount, formatName } from '@hcengineering/contact'
  import core, { AnyAttribute, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import { Asset, getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    Button,
    Component,
    Icon,
    IconEdit,
    IconMoreH,
    Label,
    Menu,
    ShowMore,
    showPopup,
    TimeSince
  } from '@hcengineering/ui'
  import type { AttributeModel } from '@hcengineering/view'
  import { getActions, ObjectPresenter } from '@hcengineering/view-resources'
  import { ActivityKey, DisplayTx } from '../activity'
  import activity from '../plugin'
  import TxViewTx from './TxViewTx.svelte'
  import { getValue, TxDisplayViewlet, updateViewlet } from '../utils'

  export let tx: DisplayTx
  export let viewlets: Map<ActivityKey, TxViewlet>
  export let showIcon: boolean = true
  export let isNew: boolean = false
  export let isNextNew: boolean = false
  export let contentHidden: boolean = false
  // export let showDocument = false

  let ptx: DisplayTx | undefined

  let viewlet: TxDisplayViewlet | undefined
  let props: any
  let employee: EmployeeAccount | undefined
  let model: AttributeModel[] = []
  let modelIcon: Asset | undefined = undefined

  let edit = false

  $: if (tx.tx._id !== ptx?.tx._id) {
    if (tx.tx.modifiedBy !== employee?._id) {
      employee = undefined
    }
    viewlet = undefined
    props = undefined
    model = []
    ptx = tx
  }

  const client = getClient()
  const query = createQuery()

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

  $: query.query(
    contact.class.EmployeeAccount,
    { _id: tx.tx.modifiedBy as Ref<EmployeeAccount> },
    (account) => {
      ;[employee] = account
    },
    { limit: 1 }
  )

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
            action: async (_: any, evt: Event) => {
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

  async function updateMessageType (model: AttributeModel[], tx: DisplayTx): Promise<boolean> {
    for (const m of model) {
      if (isMessageType(m.attribute)) {
        return true
      }
      const val = await getValue(client, m, tx)
      if (val.added.length > 1 || val.removed.length > 1) {
        return true
      }
    }
    return false
  }
  let hasMessageType = false
  $: updateMessageType(model, tx).then((res) => {
    hasMessageType = res
  })
</script>

{#if (viewlet !== undefined && !((viewlet?.hideOnRemove ?? false) && tx.removed)) || model.length > 0}
  <div class="flex-between msgactivity-container" class:showIcon class:isNew class:isNextNew>
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

    <div
      class="flex-grow flex-col clear-mins"
      class:comment={viewlet && viewlet?.editable}
      class:mention={viewlet?.display === 'emphasized' || isMessageType(model[0]?.attribute)}
    >
      <div class="flex-between">
        <div class="flex-row-center flex-grow label">
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
            <div class="flex-row-center">
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
                {#if value.added.length}
                  <span class="lower" class:flex-grow={hasMessageType}>
                    <Label label={activity.string.Added} />
                    <Label label={activity.string.To} />
                    <Label label={m.label} />
                  </span>
                  {#if hasMessageType && value.added.length < 2}
                    <div class="time"><TimeSince value={tx.tx.modifiedOn} /></div>
                  {/if}
                  <div class="strong">
                    <div class="flex flex-wrap gap-2" class:emphasized={value.added.length > 1}>
                      {#each value.added as cvalue}
                        {#if value.isObjectAdded}
                          <ObjectPresenter value={cvalue} />
                        {:else}
                          <svelte:component this={m.presenter} value={cvalue} />
                        {/if}
                      {/each}
                    </div>
                  </div>
                  {#if value.added.length > 1}
                    <div class="time"><TimeSince value={tx.tx.modifiedOn} /></div>
                  {/if}
                {:else if value.removed.length}
                  <span class="lower" class:flex-grow={hasMessageType}>
                    <Label label={activity.string.Removed} />
                    <Label label={activity.string.From} />
                    <Label label={m.label} />
                  </span>
                  {#if hasMessageType}
                    <div class="time"><TimeSince value={tx.tx.modifiedOn} /></div>
                  {/if}
                  <div class="strong">
                    <div class="flex flex-wrap gap-2 flex-grow" class:emphasized={value.removed.length > 1}>
                      {#each value.removed as cvalue}
                        {#if value.isObjectRemoved}
                          <ObjectPresenter value={cvalue} />
                        {:else}
                          <svelte:component this={m.presenter} value={cvalue} />
                        {/if}
                      {/each}
                    </div>
                  </div>
                {:else if value.set === null || value.set === undefined || value.set === ''}
                  <span class="lower"><Label label={activity.string.Unset} /> <Label label={m.label} /></span>
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
                      {#if value.isObjectSet}
                        <ObjectPresenter value={value.set} />
                      {:else}
                        <svelte:component this={m.presenter} value={value.set} />
                      {/if}
                    </div>
                  {:else}
                    <div class="strong">
                      {#if value.isObjectSet}
                        <ObjectPresenter value={value.set} />
                      {:else}
                        <svelte:component this={m.presenter} value={value.set} />
                      {/if}
                    </div>
                  {/if}
                {/if}
              {/await}
            {/each}
          {:else if viewlet === undefined && model.length > 0 && tx.mixinTx}
            {#each model as m}
              {#await getValue(client, m, tx) then value}
                {#if value.set === null || value.set === ''}
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
                      {#if value.isObjectSet}
                        <ObjectPresenter value={value.set} />
                      {:else}
                        <svelte:component this={m.presenter} value={value.set} />
                      {/if}
                    </div>
                  {:else}
                    <div class="strong">
                      {#if value.isObjectSet}
                        <ObjectPresenter value={value.set} />
                      {:else}
                        <svelte:component this={m.presenter} value={value.set} />
                      {/if}
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
        <div class="activity-content {viewlet.display}" class:contentHidden>
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
  .comment,
  .mention {
    position: relative;
    margin-top: 0.25rem;

    &::after {
      content: '';
      position: absolute;
      bottom: -0.75rem;
      left: -0.625rem;
      right: -0.625rem;
      background-color: var(--accent-bg-color);
      border: 1px solid var(--divider-color);
      border-radius: 0.5rem;
      z-index: -1;
    }
  }
  .comment::after {
    top: -0.375rem;
  }
  .mention::after {
    top: -0.5rem;
  }

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
      background-color: var(--popup-divider);
    }
    &.isNew {
      &::before {
        background-color: var(--highlight-red);
      }
      .icon {
        border: 1px solid var(--highlight-red);
      }
      &.isNextNew {
        &:after {
          background-color: var(--highlight-red);
        }
      }
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
    color: var(--caption-color);
    border: 1px solid var(--popup-divider);
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
      color: var(--caption-color);
    }
    .strong {
      font-weight: 500;
      color: var(--accent-color);
    }
  }

  .time {
    align-self: baseline;
    margin-left: 1rem;
    color: var(--dark-color);
  }

  .content {
    flex-shrink: 0;
    margin-top: 0.5rem;
    min-width: 0;
    min-height: 0;
  }

  .emphasized {
    margin-top: 0.5rem;
    background-color: var(--body-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
  }

  .message {
    flex-basis: 100%;
  }

  .lower {
    text-transform: lowercase;
  }
  .activity-content {
    overflow: hidden;
    visibility: visible;
    max-height: max-content;
    opacity: 1;
    transition-property: max-height, opacity;
    transition-timing-function: ease-in-out;
    transition-duration: 0.15s;

    &.contentHidden {
      visibility: hidden;
      padding: 0;
      margin-top: -0.5rem;
      max-height: 0;
      opacity: 0;
    }
  }
</style>
