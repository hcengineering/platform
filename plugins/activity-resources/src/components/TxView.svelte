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
  import type { DisplayTx, TxViewlet } from '@hcengineering/activity'
  import attachment from '@hcengineering/attachment'
  import chunter from '@hcengineering/chunter'
  import contact, { Person, PersonAccount, getName } from '@hcengineering/contact'
  import core, { AnyAttribute, Class, Doc, Ref, TxCUD, getCurrentAccount } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import ui, {
    ActionIcon,
    AnyComponent,
    Component,
    Icon,
    IconActivityEdit,
    IconEdit,
    IconMoreH,
    Label,
    ShowMore,
    TimeSince,
    showPopup
  } from '@hcengineering/ui'
  import type { AttributeModel } from '@hcengineering/view'
  import { Menu, ObjectPresenter } from '@hcengineering/view-resources'
  import { tick } from 'svelte'
  import { ActivityKey } from '../activity'
  import activity from '../plugin'
  import { TxDisplayViewlet, getPrevValue, getValue, updateViewlet } from '../utils'
  import TxViewTx from './TxViewTx.svelte'

  export let tx: DisplayTx
  export let viewlets: Map<ActivityKey, TxViewlet[]>
  export let showIcon: boolean = true
  export let isNew: boolean = false
  export let isNextNew: boolean = false
  export let contentHidden: boolean = false
  export let shouldScroll: boolean = false
  export let boundary: HTMLElement | undefined = undefined
  // export let showDocument = false

  let ptx: DisplayTx | undefined

  let viewlet: TxDisplayViewlet | undefined
  let props: any
  let account: PersonAccount | undefined
  let person: Person | undefined
  let model: AttributeModel[] = []
  let modelIcon: Asset | undefined = undefined
  let iconComponent: AnyComponent | undefined = undefined

  let edit: boolean = false
  let showDiff: boolean = false

  $: if (tx.tx._id !== ptx?.tx._id) {
    if (tx.tx.modifiedBy !== account?._id) {
      account = undefined
      person = undefined
    }
    viewlet = undefined
    props = undefined
    model = []
    ptx = tx
  }

  const client = getClient()
  const query = createQuery()
  const employeeQuery = createQuery()

  function getProps (props: any, edit: boolean): any {
    return { ...props, edit, attr: tx.collectionAttribute, boundary }
  }

  $: updateViewlet(client, viewlets, tx).then((result) => {
    if (result.id === tx.tx._id) {
      viewlet = result.viewlet
      model = result.model
      modelIcon = result.modelIcon
      iconComponent = result.iconComponent
      props = getProps(result.props, edit)
      if (shouldScroll) {
        tick().then(scrollIntoView)
      }
    }
  })

  $: query.query(
    contact.class.PersonAccount,
    { _id: tx.tx.modifiedBy as Ref<PersonAccount> },
    (res) => {
      ;[account] = res
    },
    { limit: 1 }
  )

  $: account &&
    employeeQuery.query(
      contact.class.Person,
      { _id: account.person },
      (res) => {
        ;[person] = res
      },
      { limit: 1 }
    )

  const showMenu = async (ev: MouseEvent): Promise<void> => {
    showPopup(
      Menu,
      {
        object: tx.doc as Doc,
        actions: [
          {
            label: activity.string.Edit,
            icon: IconEdit,
            action: () => {
              edit = true
              props = getProps(props, edit)
            }
          }
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
  function isAttachment (tx: TxCUD<Doc>): boolean {
    return tx.objectClass === attachment.class.Attachment && tx._class === core.class.TxCreateDoc
  }
  function isMention (_class?: Ref<Class<Doc>>): boolean {
    return _class === chunter.class.Backlink
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
  $: isComment = viewlet && viewlet?.editable
  $: isAttached = isAttachment(tx.tx)
  $: isMentioned = isMention(tx.tx.objectClass)
  $: withAvatar = isComment || isMentioned || isAttached
  $: isEmphasized = viewlet?.display === 'emphasized' || model.every((m) => isMessageType(m.attribute))
  $: isColumn = isComment || isEmphasized || hasMessageType

  let htmlElement: HTMLDivElement

  function scrollIntoView () {
    htmlElement?.scrollIntoView({ behavior: 'auto', block: 'start' })
    shouldScroll = false
  }
</script>

{#if (viewlet !== undefined && !((viewlet?.hideOnRemove ?? false) && tx.removed)) || model.length > 0}
  <div
    class="msgactivity-container"
    bind:this={htmlElement}
    class:showIcon
    class:withAvatar
    class:isNew
    class:isNextNew
  >
    {#if showIcon}
      {#if withAvatar}
        <div class="msgactivity-avatar">
          <Component
            is={contact.component.Avatar}
            props={{ avatar: person?.avatar, size: 'medium', name: person?.name }}
          />
        </div>
      {:else}
        <div class="msgactivity-icon">
          {#if iconComponent}
            <Component is={iconComponent} {props} />
          {:else if viewlet}
            <Icon icon={viewlet.icon} size="small" />
          {:else if viewlet === undefined && model.length > 0}
            <Icon icon={modelIcon !== undefined ? modelIcon : IconActivityEdit} size="small" />
          {:else}
            <Icon icon={IconActivityEdit} size="small" />
          {/if}
        </div>
      {/if}
    {/if}

    <div class="msgactivity-content" class:content={isColumn} class:comment={withAvatar}>
      <div class="msgactivity-content__header">
        <div class="msgactivity-content__title labels-row">
          <span class={withAvatar ? 'bold' : 'strong'}>
            {#if person}
              {getName(client.getHierarchy(), person)}
            {:else}
              <Label label={core.string.System} />
            {/if}
          </span>

          {#if viewlet && viewlet?.editable}
            {#if viewlet.label}
              <span class="lower"><Label label={viewlet.label} params={viewlet.labelParams ?? {}} /></span>
            {/if}
            {#if tx.updated}
              <span class="lower"><Label label={activity.string.Edited} /></span>
            {/if}
            <span class="time ml-1"><TimeSince value={tx.tx.modifiedOn} /></span>
          {:else if viewlet && viewlet.label}
            <span class="lower whitespace-nowrap">
              <Label label={viewlet.label} params={viewlet.labelParams ?? {}} />
            </span>
          {/if}
          {#if viewlet && viewlet.labelComponent}
            <Component is={viewlet.labelComponent} {props} />
          {/if}

          {#if viewlet === undefined && model.length > 0 && tx.updateTx}
            {#each model as m}
              {#await getValue(client, m, tx) then value}
                {#if value.added.length}
                  <span class="lower"><Label label={activity.string.Added} /></span>
                  <span class="lower"><Label label={activity.string.To} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                  {#each value.added as cvalue}
                    {#if value.isObjectAdded}
                      <ObjectPresenter value={cvalue} accent />
                    {:else}
                      <svelte:component this={m.presenter} value={cvalue} accent />
                    {/if}
                  {/each}
                {:else if value.removed.length}
                  <span class="lower"><Label label={activity.string.Removed} /></span>
                  <span class="lower"><Label label={activity.string.From} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                  {#each value.removed as cvalue}
                    {#if value.isObjectRemoved}
                      <ObjectPresenter value={cvalue} accent />
                    {:else}
                      <svelte:component this={m.presenter} value={cvalue} accent />
                    {/if}
                  {/each}
                {:else if value.set === null || value.set === undefined || value.set === ''}
                  <span class="lower"><Label label={activity.string.Unset} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                {:else}
                  <span class="lower"><Label label={activity.string.Changed} /></span>
                  <span class="lower"><Label label={m.label} /></span>

                  {#if !hasMessageType}
                    <span class="lower"><Label label={activity.string.To} /></span>
                    <span class="strong overflow-label">
                      {#if value.isObjectSet}
                        <ObjectPresenter value={value.set} accent />
                      {:else}
                        <svelte:component this={m.presenter} value={value.set} accent />
                      {/if}
                    </span>
                  {:else}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span class="show-diff" on:click={() => (showDiff = !showDiff)}>
                      <Label label={showDiff ? ui.string.ShowLess : ui.string.ShowMore} />
                    </span>
                  {/if}
                {/if}
              {/await}
            {/each}
          {:else if viewlet === undefined && model.length > 0 && tx.mixinTx}
            {#each model as m}
              {#await getValue(client, m, tx) then value}
                {#if value.set === null || value.set === ''}
                  <span class="lower"><Label label={activity.string.Unset} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                {:else}
                  <span class="lower"><Label label={activity.string.Changed} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                  <span class="lower"><Label label={activity.string.To} /></span>

                  {#if !hasMessageType}
                    <div class="strong overflow-label">
                      {#if value.isObjectSet}
                        <ObjectPresenter value={value.set} accent />
                      {:else}
                        <svelte:component this={m.presenter} value={value.set} accent />
                      {/if}
                    </div>
                  {/if}
                {/if}
              {/await}
            {/each}
          {:else if viewlet && viewlet.display === 'inline' && viewlet.component}
            {#if tx.collectionAttribute !== undefined && (tx.txDocIds?.size ?? 0) > 1}
              <TxViewTx {tx} {onCancelEdit} {edit} {viewlet} />
            {:else if typeof viewlet.component === 'string'}
              <Component is={viewlet.component} {props} on:close={onCancelEdit} />
            {:else}
              <svelte:component this={viewlet.component} {...props} on:close={onCancelEdit} />
            {/if}
          {/if}
        </div>
        {#if isComment}
          <div class="buttons-group">
            <!-- <Like /> -->
            {#if tx.tx.modifiedBy === getCurrentAccount()._id}
              <ActionIcon icon={IconMoreH} size={'small'} action={showMenu} />
            {/if}
          </div>
        {:else if hasMessageType || isColumn}
          <span class="time top ml-4"><TimeSince value={tx.tx.modifiedOn} /></span>
        {/if}
      </div>

      {#if !isColumn}
        <span class="time top ml-4"><TimeSince value={tx.tx.modifiedOn} /></span>
      {/if}

      {#if viewlet && viewlet.display !== 'inline'}
        <div class="activity-content content" class:indent={isAttached} class:contentHidden>
          <ShowMore ignore={edit}>
            {#if tx.collectionAttribute !== undefined && (tx.txDocIds?.size ?? 0) > 1}
              <div class="flex-row-center flex-grow flex-wrap m--1 gap-around-2 clear-mins">
                <TxViewTx {tx} {onCancelEdit} {edit} {viewlet} presentersOnly={isAttached} />
              </div>
            {:else if typeof viewlet.component === 'string'}
              <Component is={viewlet.component} {props} on:close={onCancelEdit} />
            {:else}
              <svelte:component this={viewlet.component} {...props} on:close={onCancelEdit} />
            {/if}
          </ShowMore>
        </div>
      {:else if hasMessageType && model.length > 0 && (tx.updateTx || tx.mixinTx)}
        {#await getValue(client, model[0], tx) then value}
          {@const prevValue = getPrevValue(client, model[0], tx)}
          <div class="activity-content content" class:indent={isAttached} class:contentHidden>
            <ShowMore ignore={edit || prevValue !== undefined}>
              {#if value.isObjectSet}
                <ObjectPresenter value={value.set} />
              {:else if showDiff}
                <svelte:component this={model[0].presenter} value={value.set} {prevValue} showOnlyDiff />
              {/if}
            </ShowMore>
          </div>
        {/await}
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .msgactivity-container {
    position: relative;
    display: flex;
    justify-content: space-between;
    min-width: 0;

    .msgactivity-icon,
    .msgactivity-avatar {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-right: 1rem;
      width: 2.25rem;
      min-width: 2.25rem;
      color: var(--theme-darker-color);
    }
    .msgactivity-icon {
      height: 1.75rem;
    }
    .msgactivity-avatar {
      height: 2.25rem;
      // background-color: var(--theme-darker-color);
      border: 1px dashed var(--divider-trans-color);
      border-radius: 50%;
    }

    .msgactivity-content {
      display: flex;
      flex-grow: 1;
      margin-right: 1rem;
      min-width: 0;
      color: var(--theme-dark-color);

      .msgactivity-content__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-grow: 1;
        min-width: 0;
      }
      .msgactivity-content__title {
        display: inline-flex;
        align-items: center;
        flex-grow: 1;
        min-width: 0;
      }

      &.content {
        flex-direction: column;
        padding-bottom: 0.25rem;
      }
      &:not(.comment) {
        .msgactivity-content__header {
          min-height: 1.75rem;
        }
      }
      &:not(.content) {
        align-items: center;

        .msgactivity-content__header {
          justify-content: space-between;
        }
      }
    }
  }

  .showIcon {
    &::after,
    &::before {
      position: absolute;
      left: 1.125rem;
      width: 1px;
      background-color: var(--divider-trans-color);
      z-index: 1;
    }
    &.isNew {
      &::before {
        background-color: var(--highlight-red);
      }
      .icon {
        border: 1px solid var(--highlight-red);
      }
    }
    &.isNextNew {
      &::after {
        background-color: var(--highlight-red);
      }
    }
    &::before {
      top: -0.75rem;
      height: 0.75rem;
    }
    &.withAvatar::after {
      content: '';
      top: 2.25rem;
      bottom: 0;
    }
    &:not(.withAvatar)::after {
      content: '';
      top: 1.75rem;
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

  .time {
    font-size: 0.75rem;
    color: var(--theme-trans-color);

    &.top {
      align-self: flex-start;
    }
  }

  .message {
    flex-basis: 100%;
  }

  .activity-content {
    visibility: visible;
    min-width: 0;
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
    &.indent {
      margin-top: 0.5rem;
    }
  }

  .show-diff {
    color: var(--theme-content-color);
    cursor: pointer;
    &:hover {
      color: var(--theme-caption-color);
    }
    &:active {
      color: var(--theme-content-color);
    }
  }
</style>
