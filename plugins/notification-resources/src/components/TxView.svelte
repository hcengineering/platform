<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { DisplayTx, TxViewlet } from '@hcengineering/activity'
  import {
    ActivityKey,
    getValue,
    newDisplayTx,
    TxDisplayViewlet,
    updateViewlet
  } from '@hcengineering/activity-resources'
  import activity from '@hcengineering/activity-resources/src/plugin'
  import contact, { EmployeeAccount } from '@hcengineering/contact'
  import core, { AnyAttribute, Doc, Ref, TxCUD } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component, Label, ShowMore } from '@hcengineering/ui'
  import type { AttributeModel } from '@hcengineering/view'
  import { ObjectPresenter } from '@hcengineering/view-resources'

  export let tx: TxCUD<Doc>
  export let viewlets: Map<ActivityKey, TxViewlet>
  export let contentHidden: boolean = false
  const client = getClient()

  let ptx: DisplayTx | undefined
  let viewlet: TxDisplayViewlet | undefined
  let props: any

  let employee: EmployeeAccount | undefined
  let model: AttributeModel[] = []

  $: if (tx._id !== ptx?.tx._id) {
    ptx = newDisplayTx(tx, client.getHierarchy())
    if (tx.modifiedBy !== employee?._id) {
      employee = undefined
    }
    props = undefined
    viewlet = undefined
    model = []
  }

  const query = createQuery()

  function getProps (props: any): any {
    return { ...props, attr: ptx?.collectionAttribute }
  }

  $: ptx &&
    updateViewlet(client, viewlets, ptx).then((result) => {
      if (result.id === tx._id) {
        viewlet = result.viewlet
        props = getProps(result.props)
        model = result.model
      }
    })

  $: query.query(
    contact.class.EmployeeAccount,
    { _id: tx.modifiedBy as Ref<EmployeeAccount> },
    (account) => {
      ;[employee] = account
    },
    { limit: 1 }
  )

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
  $: ptx &&
    updateMessageType(model, ptx).then((res) => {
      hasMessageType = res
    })

  $: isComment = viewlet && viewlet?.editable
  $: isMention = viewlet?.display === 'emphasized' || isMessageType(model[0]?.attribute)
  $: isColumn = isComment || isMention || hasMessageType
</script>

{#if (viewlet !== undefined && !((viewlet?.hideOnRemove ?? false) && ptx?.removed)) || model.length > 0}
  <div class="msgactivity-container">
    <div class="msgactivity-content" class:content={isColumn} class:comment={isComment}>
      <div class="msgactivity-content__header">
        <div class="msgactivity-content__title labels-row">
          {#if viewlet && viewlet?.editable}
            {#if viewlet.label}
              <span class="lower"><Label label={viewlet.label} params={viewlet.labelParams ?? {}} /></span>
            {/if}
            {#if ptx?.updated}
              <span class="lower"><Label label={activity.string.Edited} /></span>
            {/if}
          {:else if viewlet && viewlet.label}
            <span class="lower">
              <Label label={viewlet.label} params={viewlet.labelParams ?? {}} />
            </span>
            {#if viewlet.labelComponent}
              <Component is={viewlet.labelComponent} {props} />
            {/if}
          {/if}

          {#if viewlet === undefined && model.length > 0 && ptx?.updateTx}
            {#each model as m}
              {#await getValue(client, m, ptx) then value}
                {#if value.added.length}
                  <span class="lower"><Label label={activity.string.Added} /></span>
                  <span class="lower"><Label label={activity.string.To} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                  {#each value.added as cvalue}
                    {#if value.isObjectAdded}
                      <ObjectPresenter value={cvalue} inline />
                    {:else}
                      <svelte:component this={m.presenter} value={cvalue} inline />
                    {/if}
                  {/each}
                {:else if value.removed.length}
                  <span class="lower"><Label label={activity.string.Removed} /></span>
                  <span class="lower"><Label label={activity.string.From} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                  {#each value.removed as cvalue}
                    {#if value.isObjectRemoved}
                      <ObjectPresenter value={cvalue} inline />
                    {:else}
                      <svelte:component this={m.presenter} value={cvalue} inline />
                    {/if}
                  {/each}
                {:else if value.set === null || value.set === undefined || value.set === ''}
                  <span class="lower"><Label label={activity.string.Unset} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                {:else}
                  <span class="lower"><Label label={activity.string.Changed} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                  <span class="lower"><Label label={activity.string.To} /></span>

                  {#if !hasMessageType}
                    <span class="strong">
                      {#if value.isObjectSet}
                        <ObjectPresenter value={value.set} inline />
                      {:else}
                        <svelte:component this={m.presenter} value={value.set} inline />
                      {/if}
                    </span>
                  {/if}
                {/if}
              {/await}
            {/each}
          {:else if viewlet === undefined && model.length > 0 && ptx?.mixinTx}
            {#each model as m}
              {#await getValue(client, m, ptx) then value}
                {#if value.set === null || value.set === ''}
                  <span class="lower"><Label label={activity.string.Unset} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                {:else}
                  <span class="lower"><Label label={activity.string.Changed} /></span>
                  <span class="lower"><Label label={m.label} /></span>
                  <span class="lower"><Label label={activity.string.To} /></span>

                  {#if !hasMessageType}
                    <div class="strong">
                      {#if value.isObjectSet}
                        <ObjectPresenter value={value.set} inline />
                      {:else}
                        <svelte:component this={m.presenter} value={value.set} inline />
                      {/if}
                    </div>
                  {/if}
                {/if}
              {/await}
            {/each}
          {:else if viewlet && viewlet.display === 'inline' && viewlet.component}
            {#if typeof viewlet.component === 'string'}
              <Component is={viewlet.component} {props} inline />
            {:else}
              <svelte:component this={viewlet.component} {...props} inline />
            {/if}
          {/if}
        </div>
      </div>

      {#if viewlet && viewlet.display !== 'inline'}
        <div class="activity-content content" class:contentHidden>
          <ShowMore>
            {#if typeof viewlet.component === 'string'}
              <Component is={viewlet.component} {props} />
            {:else}
              <svelte:component this={viewlet.component} {...props} />
            {/if}
          </ShowMore>
        </div>
      {:else if hasMessageType && model.length > 0 && (ptx?.updateTx || ptx?.mixinTx)}
        {#await getValue(client, model[0], ptx) then value}
          <div class="activity-content content" class:contentHidden>
            <ShowMore>
              {#if value.isObjectSet}
                <ObjectPresenter value={value.set} inline />
              {:else}
                <svelte:component this={model[0].presenter} value={value.set} inline />
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

    .msgactivity-content {
      display: flex;
      flex-grow: 1;
      margin-right: 1rem;
      color: var(--content-color);

      .msgactivity-content__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-grow: 1;
      }
      .msgactivity-content__title {
        display: inline-flex;
        align-items: baseline;
        flex-grow: 1;
      }

      &.content {
        flex-direction: column;
        padding-bottom: 0.25rem;
      }
      &.comment {
        .activity-content {
          margin-top: 0.25rem;
        }
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

  :global(.msgactivity-container + .msgactivity-container::before) {
    content: '';
  }

  .activity-content {
    overflow: hidden;
    visibility: visible;
    margin-top: 0.125rem;
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
