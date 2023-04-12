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
  import { DisplayTx } from '@hcengineering/activity'
  import core, { AttachedDoc, Doc, TxCUD, TxCollectionCUD, TxProcessor } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import contact from '../../plugin'
  import { Channel, Contact } from '@hcengineering/contact'
  import { newDisplayTx } from '@hcengineering/activity-resources'
  import { createEventDispatcher } from 'svelte'

  export let object: Contact
  export let filtered: DisplayTx[]

  let channels: Channel[] = []

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const query = createQuery()
  $: query.query(
    contact.class.Channel,
    {
      attachedTo: object._id,
      provider: contact.channelProvider.Email
    },
    (res) => {
      channels = res
    }
  )

  let newTxes: DisplayTx[] = []

  const txQuery = createQuery()
  $: txQuery.query(
    core.class.TxCollectionCUD,
    {
      objectId: { $in: channels.map((p) => p._id) },
      'tx._class': core.class.TxCreateDoc,
      'tx.attributes.incoming': false
    },
    (res) => {
      newTxes = createDisplayTxes(res)
    }
  )

  function update (filtered: DisplayTx[], newTxes: DisplayTx[]) {
    const result = filtered.concat(newTxes).sort((a, b) => a.tx.modifiedOn - b.tx.modifiedOn)
    dispatch('update', result)
  }

  $: update(filtered, newTxes)

  function createDisplayTxes (txes: TxCollectionCUD<Doc, AttachedDoc>[]): DisplayTx[] {
    return txes.map((p) => newDisplayTx(TxProcessor.extractTx(p) as TxCUD<Doc>, hierarchy, false))
  }
</script>
