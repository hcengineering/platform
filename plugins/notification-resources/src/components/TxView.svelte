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
    TxDisplayViewlet,
    getValue,
    newDisplayTx,
    updateViewlet
  } from '@hcengineering/activity-resources'
  import activity from '@hcengineering/activity-resources/src/plugin'
  import attachment from '@hcengineering/attachment'
  import chunter from '@hcengineering/chunter'
  import { Person, PersonAccount } from '@hcengineering/contact'
  import { Avatar, personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import core, { AnyAttribute, Class, Doc, Ref, TxCUD } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component, Icon, IconActivityEdit, Label } from '@hcengineering/ui'
  import type { AttributeModel } from '@hcengineering/view'
  import { ObjectPresenter } from '@hcengineering/view-resources'

  export let tx: TxCUD<Doc>
  export let objectId: Ref<Doc>
  export let viewlets: Map<ActivityKey, TxViewlet[]>
  const client = getClient()

  let ptx: DisplayTx | undefined
  let viewlet: TxDisplayViewlet | undefined
  let props: any

  let account: PersonAccount | undefined
  let employee: Person | undefined
  let model: AttributeModel[] = []
  let iconComponent: AnyComponent | undefined = undefined
  let modelIcon: Asset | undefined = undefined

  $: if (tx._id !== ptx?.tx._id) {
    ptx = newDisplayTx(tx, client.getHierarchy(), objectId === tx.objectId)
    if (tx.modifiedBy !== account?._id) {
      account = undefined
      employee = undefined
    }
    props = undefined
    viewlet = undefined
    model = []
  }

  function getProps (props: any): any {
    return { ...props, attr: ptx?.collectionAttribute }
  }

  $: ptx &&
    updateViewlet(client, viewlets, ptx).then((result) => {
      if (result.id === tx._id) {
        viewlet = result.viewlet
        modelIcon = result.modelIcon
        iconComponent = result.iconComponent
        props = getProps(result.props)
        model = result.model
      }
    })

  $: account = $personAccountByIdStore.get(tx.modifiedBy as Ref<PersonAccount>)
  $: employee = account ? $personByIdStore.get(account?.person) : undefined

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
  $: isAttached = isAttachment(tx)
  $: isMentioned = isMention(tx.objectClass)
  $: withAvatar = isComment || isMentioned || isAttached
  $: isEmphasized = viewlet?.display === 'emphasized' || model.every((m) => isMessageType(m.attribute))
  $: isColumn = isComment || isEmphasized || hasMessageType

  function isAttachment (tx: TxCUD<Doc>): boolean {
    return tx.objectClass === attachment.class.Attachment && tx._class === core.class.TxCreateDoc
  }
  function isMention (_class?: Ref<Class<Doc>>): boolean {
    return _class === chunter.class.Backlink
  }
</script>

{#if (viewlet !== undefined && !((viewlet?.hideOnRemove ?? false) && ptx?.removed)) || model.length > 0}
  <div class="msgactivity-container">
    {#if withAvatar}
      <div class="msgactivity-avatar">
        <Avatar avatar={employee?.avatar} size={'x-small'} name={employee?.name} />
      </div>
    {:else}
      <div class="msgactivity-icon">
        {#if iconComponent}
          <Component is={iconComponent} {props} />
        {:else if viewlet}
          <Icon icon={viewlet.icon} size="medium" />
        {:else if viewlet === undefined && model.length > 0}
          <Icon icon={modelIcon !== undefined ? modelIcon : IconActivityEdit} size="medium" />
        {:else}
          <Icon icon={IconActivityEdit} size="medium" />
        {/if}
      </div>
    {/if}
    <div class="msgactivity-content" class:content={isColumn} class:comment={isComment}>
      <div class="msgactivity-content__title labels-row">
        {#if viewlet && viewlet?.editable}
          {#if viewlet.label}
            <span class="lower"><Label label={viewlet.label} params={viewlet.labelParams ?? {}} /></span>
          {/if}
          {#if ptx?.updated}
            <span class="lower"><Label label={activity.string.Edited} /></span>
          {/if}
        {:else if viewlet && viewlet.label}
          <span class="lower whitespace-nowrap">
            <Label label={viewlet.label} params={viewlet.labelParams ?? {}} />
          </span>
        {/if}
        {#if viewlet && viewlet.labelComponent}
          <Component is={viewlet.labelComponent} {props} />
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
                    <ObjectPresenter value={cvalue} />
                  {:else}
                    <svelte:component this={m.presenter} value={cvalue} />
                  {/if}
                {/each}
              {:else if value.removed.length}
                <span class="lower"><Label label={activity.string.Removed} /></span>
                <span class="lower"><Label label={activity.string.From} /></span>
                <span class="lower"><Label label={m.label} /></span>
                {#each value.removed as cvalue}
                  {#if value.isObjectRemoved}
                    <ObjectPresenter value={cvalue} />
                  {:else}
                    <svelte:component this={m.presenter} value={cvalue} />
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
                      <ObjectPresenter value={value.set} accent />
                    {:else}
                      <svelte:component this={m.presenter} value={value.set} accent />
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
          {#if typeof viewlet.component === 'string'}
            <Component is={viewlet.component} {props} />
          {:else}
            <svelte:component this={viewlet.component} {...props} />
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .msgactivity-container {
    display: flex;
    align-items: center;
    min-width: 0;
    min-height: 0;

    .msgactivity-content {
      display: flex;
      flex-grow: 1;
      margin-left: 0.5rem;
      margin-right: 1rem;
      min-width: 0;
      min-height: 0;
    }
  }
  .msgactivity-icon,
  .msgactivity-avatar {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    min-width: 0;
  }
</style>
