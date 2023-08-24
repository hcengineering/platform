<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { ActivityKey, getValue, newDisplayTx, updateViewlet } from '@hcengineering/activity-resources'
  import activity from '@hcengineering/activity-resources/src/plugin'
  import { PersonAccount } from '@hcengineering/contact'
  import { personAccountByIdStore } from '@hcengineering/contact-resources'
  import core, { AnyAttribute, Doc, Ref, Tx, TxCUD } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import type { AttributeModel } from '@hcengineering/view'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import request from '../plugin'

  export let tx: Tx
  const viewlets: Map<ActivityKey, TxViewlet[]> = new Map<ActivityKey, TxViewlet[]>()
  const client = getClient()

  let ptx: DisplayTx | undefined

  let props: any
  let employee: PersonAccount | undefined
  let model: AttributeModel[] = []
  let modelIcon: Asset | undefined = undefined

  $: if (tx._id !== ptx?.tx._id) {
    ptx = newDisplayTx(tx as TxCUD<Doc>, client.getHierarchy(), false)
    if (tx.modifiedBy !== employee?._id) {
      employee = undefined
    }
    props = undefined
    model = []
  }

  $: ptx &&
    updateViewlet(client, viewlets, ptx).then((result) => {
      if (result.id === tx._id) {
        model = result.model
        modelIcon = result.modelIcon
        props = result.props
      }
    })

  $: employee = $personAccountByIdStore.get(tx.modifiedBy as Ref<PersonAccount>)

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
</script>

{#if model.length > 0}
  <div class="flex-between msgactivity-container">
    <div class="flex-grow flex-col clear-mins" class:mention={isMessageType(model[0]?.attribute)}>
      <div class="flex-between">
        <div class="flex-row-center flex-grow label">
          {#if ptx?.updateTx}
            {#each model as m}
              {#await getValue(client, m, ptx) then value}
                {#if value.set === null || value.set === undefined}
                  <span class="lower"><Label label={activity.string.Unset} /><Label label={m.label} /></span>
                {:else if value.added.length}
                  <span class="lower" class:flex-grow={hasMessageType}>
                    <Label label={request.string.Add} />
                    <Label label={activity.string.To} />
                    <Label label={m.label} />
                  </span>
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
                {:else if value.removed.length}
                  <span class="lower" class:flex-grow={hasMessageType}>
                    <Label label={request.string.Remove} />
                    <Label label={activity.string.From} />
                    <Label label={m.label} />
                  </span>
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
                {:else}
                  <span class="lower" class:flex-grow={hasMessageType}>
                    <Label label={request.string.Change} />
                    <Label label={m.label} />
                    <Label label={activity.string.To} />
                  </span>
                  <div
                    class="strong"
                    class:message={isMessageType(m.attribute)}
                    class:emphasized={isMessageType(m.attribute)}
                  >
                    {#if value.isObjectSet}
                      <ObjectPresenter value={value.set} />
                    {:else}
                      <svelte:component this={m.presenter} value={value.set} />
                    {/if}
                  </div>
                {/if}
              {/await}
            {/each}
          {:else if ptx?.mixinTx}
            {#each model as m}
              {#await getValue(client, m, ptx) then value}
                {#if value.set === null}
                  <span>
                    <Label label={activity.string.Unset} /> <span class="lower"><Label label={m.label} /></span>
                  </span>
                {:else}
                  <span>
                    <Label label={request.string.Change} />
                    <span class="lower"><Label label={m.label} /></span>
                    <Label label={activity.string.To} />
                  </span>
                  <div
                    class="strong"
                    class:message={isMessageType(m.attribute)}
                    class:emphasized={isMessageType(m.attribute)}
                  >
                    <svelte:component this={m.presenter} value={value.set} />
                  </div>
                {/if}
              {/await}
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
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
  .mention::after {
    top: -0.5rem;
  }

  .msgactivity-container {
    position: relative;
    min-width: 0;
  }

  .emphasized {
    margin-top: 0.5rem;
    background-color: var(--theme-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
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

    .strong {
      font-weight: 500;
      color: var(--accent-color);
    }
  }

  .message {
    flex-basis: 100%;
  }
</style>
