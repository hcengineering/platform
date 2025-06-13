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
  import { ActivityMessage, ActivityMessageExtra } from '@hcengineering/communication-types'
  import { Person } from '@hcengineering/contact'

  import ActivityObjectValue from './activity/ActivityObjectValue.svelte'
  import ActivityUpdateViewer from './activity/ActivityUpdateViewer.svelte'
  import { getAttributeModel } from '../../activity'

  export let card: Card
  export let message: ActivityMessage
  export let author: Person | undefined

  const client = getClient()

  let extra: ActivityMessageExtra = message.extra ?? {}
  let attributeModel: AttributeModel | undefined = undefined

  $: extra = message.extra ?? {}

  $: void getAttributeModel(client, message.extra?.update, card._class).then((model) => {
    attributeModel = model
  })
</script>

{#if extra.action === 'create'}
  <ActivityObjectValue {message} {card} />
{:else if extra.update && extra.action === 'update'}
  <ActivityUpdateViewer update={extra.update} model={attributeModel} content={message.content} {author} {card} />
{/if}
