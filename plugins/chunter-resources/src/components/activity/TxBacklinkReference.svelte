<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import type { Backlink } from '@hcengineering/chunter'
  import type { Doc } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import { getObjectPresenter } from '@hcengineering/view-resources'
  import chunter from '../../plugin'

  // export let tx: TxCreateDoc<Backlink>
  export let value: Backlink
  // export let edit: boolean = false

  const client = getClient()
  let presenter: AttributeModel | undefined
  let targetPresenter: AttributeModel | undefined

  const docQuery = createQuery()
  const targetQuery = createQuery()
  let doc: Doc | undefined
  let target: Doc | undefined

  $: value.backlinkClass != null &&
    docQuery.query(value.backlinkClass, { _id: value.backlinkId }, (r) => {
      doc = r.shift()
    })

  $: targetQuery.query(value.attachedToClass, { _id: value.attachedTo }, (r) => {
    target = r.shift()
  })

  $: if (target !== undefined) {
    getObjectPresenter(client, target._class, { key: '' }).then((p) => {
      targetPresenter = p
    })
  }

  $: if (doc !== undefined) {
    getObjectPresenter(client, doc._class, { key: '' }).then((p) => {
      presenter = p
    })
  }
</script>

{#if presenter}
  {#if targetPresenter}
    <div class="mx-2">
      <svelte:component this={targetPresenter.presenter} value={target} />
    </div>
  {/if}
  <span style:text-transform={'lowercase'}><Label label={chunter.string.In} /></span>
  <div class="ml-2">
    <svelte:component this={presenter.presenter} value={doc} />
  </div>
{/if}
