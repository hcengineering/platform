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
  import { Doc, Ref, TxCUD } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Component, resizeObserver } from '@hcengineering/ui'
  import { DocNavLink, ObjectPresenter } from '@hcengineering/view-resources'
  import { ItemPresenter } from '@hcengineering/time'
  import { createEventDispatcher } from 'svelte'
  import time from '../../../plugin'

  export let tx: TxCUD<Doc>[]
  const dispatch = createEventDispatcher()
  const client = getClient()

  interface ObjData {
    doc?: Doc
    txes: TxCUD<Doc>[]
    itemPresenter?: ItemPresenter
  }
  let objects: ObjData[] = []

  async function group (txes: TxCUD<Doc>[]): Promise<void> {
    const h = client.getHierarchy()
    const objs = new Map<Ref<Doc>, ObjData>()

    for (const tx of txes.slice(0, 100)) {
      const dta: ObjData = objs.get(tx.objectId) ?? {
        doc: await client.findOne(tx.objectClass, { _id: tx.objectId }),
        txes: [],
        itemPresenter: h.classHierarchyMixin(tx.objectClass, time.mixin.ItemPresenter)
      }
      dta.txes.push(tx)
      objs.set(tx.objectId, dta)
    }
    objects = Array.from(objs.values())
  }

  $: group(tx)
</script>

<div use:resizeObserver={() => dispatch('changeContent')} class="p-1" style:overflow={'auto'}>
  {#each objects as object}
    <div class="p-1">
      {#if object.itemPresenter && object.doc !== undefined}
        <DocNavLink object={object.doc}>
          <ObjectPresenter objectId={object.doc?._id} _class={object.doc._class} value={object.doc} />
          <Component
            is={object.itemPresenter.presenter}
            props={{ value: object.doc, withoutSpace: true, isEditable: false, shouldShowAvatar: true }}
          />
        </DocNavLink>
      {:else if object.doc !== undefined}
        <ObjectPresenter objectId={object.doc?._id} _class={object.doc._class} value={object.doc} />
      {/if}
    </div>
  {/each}
</div>
