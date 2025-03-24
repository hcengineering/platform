<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import { Card } from '@hcengineering/card'
  import { AttributeModel } from '@hcengineering/view'
  import { ActivityMessage, ActivityMessageData } from '@hcengineering/communication-types'

  import ActivityObjectValue from './activity/ActivityObjectValue.svelte'
  import ActivityUpdateViewer from './activity/ActivityUpdateViewer.svelte'
  import { getAttributeModel } from '../../activity'

  export let card: Card
  export let message: ActivityMessage

  const client = getClient()

  let data: ActivityMessageData = message.data
  let attributeModel: AttributeModel | undefined = undefined

  $: data = message.data

  $: void getAttributeModel(client, message.data?.update, card._class).then((model) => {
    attributeModel = model
  })
</script>

{#if data.action === 'create'}
  <ActivityObjectValue {message} {card} />
{:else if data.update && data.action === 'update'}
  <ActivityUpdateViewer update={data.update} model={attributeModel} />
{/if}
