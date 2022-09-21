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
  import { TxUpdateDoc } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Integration } from '@hcengineering/setting'
  import { Label } from '@hcengineering/ui'
  import setting from '../../plugin'

  export let tx: TxUpdateDoc<Integration>
  // export let doc: Integration

  const client = getClient()

  async function getTypeLabel (tx: TxUpdateDoc<Integration>): Promise<IntlString | undefined> {
    const doc = await client.findOne(setting.class.Integration, { _id: tx.objectId })
    if (doc === undefined) return
    const type = await client.findOne(setting.class.IntegrationType, { _id: doc.type })
    return type?.label
  }
</script>

&nbsp;
{#await getTypeLabel(tx) then typeLabel}
  {#if typeLabel}
    <Label label={typeLabel} />
  {/if}
{/await}
<Label label={setting.string.IntegrationDisabled} />
