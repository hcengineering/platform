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
  import core, { Class, Doc, DocumentUpdate, Tx, TxCreateDoc, TxUpdateDoc } from '@hcengineering/core'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import presentation, { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { Button, EditBox, Label } from '@hcengineering/ui'

  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'

  export let clazz: Class<Doc>
  let name: string

  const client = getClient()
  const dispatch = createEventDispatcher()

  async function save (newLabel: IntlString): Promise<void> {
    const update: DocumentUpdate<Class<Doc>> = {}
    if (newLabel !== clazz.label) {
      update.label = newLabel
    }
    await client.updateDoc(clazz._class, clazz.space, clazz._id, update)
    dispatch('close')
  }

  const query = createQuery()

  let transactions: Tx[] = []

  query.query(
    core.class.Tx,
    {
      objectId: clazz._id
    },
    (data) => {
      transactions = data
    }
  )

  $: labels = transactions
    .map((it) => {
      if (it._class === core.class.TxCreateDoc) {
        return (it as TxCreateDoc<Class<Doc>>).attributes.label
      }
      if (it._class === core.class.TxUpdateDoc) {
        return (it as TxUpdateDoc<Class<Doc>>).operations.label
      }
      return undefined
    })
    .filter((it) => it !== undefined)
    .filter((it, idx, arr) => arr.indexOf(it) === idx) as IntlString[]
</script>

<Card
  label={clazz.label}
  okLabel={presentation.string.Save}
  okAction={() => save(getEmbeddedLabel(name))}
  canSave={!(name === undefined || name.trim().length === 0)}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="mb-2">
    <EditBox bind:value={name} placeholder={setting.string.NewClassName} />
  </div>
  <Label label={setting.string.OldNames} />
  <div class="flex-col">
    {#each labels as label}
      <div class="mr-4 flex-row-center gap-2 mt-1">
        <Button label={setting.string.Select} kind={'link'} on:click={() => save(label)} size={'small'} />
        <Label {label} />
      </div>
    {/each}
  </div>
</Card>
