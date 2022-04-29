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
  import { TxUpdateDoc } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Integration, IntegrationType } from '@anticrm/setting'
  import { Button, eventToHTMLElement, showPopup } from '@anticrm/ui'
  import setting from '../../plugin'

  export let tx: TxUpdateDoc<Integration>
  let doc: Integration | undefined

  const client = getClient()

  let type: IntegrationType | undefined

  $: getType(tx)

  async function getType (tx: TxUpdateDoc<Integration>): Promise<IntegrationType | undefined> {
    doc = await client.findOne(setting.class.Integration, { _id: tx.objectId })
    if (doc === undefined) return
    type = await client.findOne(setting.class.IntegrationType, { _id: doc.type })
  }

  async function reconnect (res: any): Promise<void> {
    if (res?.value) {
      if (doc === undefined) return
      await client.update(doc, {
        disabled: false
      })
    }
  }
</script>

<div class="flex-center">
  <Button
    label={setting.string.Reconnect}
    kind={'primary'}
    on:click={(e) => {
      if (type?.reconnectComponent) {
        showPopup(type.reconnectComponent, {}, eventToHTMLElement(e), reconnect)
      }
    }}
  />
</div>
