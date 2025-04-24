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
  import { Card } from '@hcengineering/card'
  import { NotificationContext } from '@hcengineering/communication-types'
  import { createNotificationContextsQuery } from '@hcengineering/presentation'
  import { Presence } from '@hcengineering/presence-resources'

  import ChatHeader from './ChatHeader.svelte'
  import ChatBody from './ChatBody.svelte'
  import ChatFooter from './ChatFooter.svelte'

  export let card: Card

  const contextsQuery = createNotificationContextsQuery()

  let footerHeight: number | undefined = undefined
  let context: NotificationContext | undefined = undefined
  let isLoaded = false
  let cardId = card._id

  $: if (cardId !== card._id) {
    cardId = card._id
    context = undefined
    isLoaded = false
  }

  $: contextsQuery.query({ card: cardId, limit: 1 }, (res) => {
    context = res.getResult()[0]
    isLoaded = true
  })
</script>

<Presence object={card} />
<ChatHeader {card} />
{#if isLoaded}
  {#key card._id}
    <ChatBody {card} {footerHeight} {context} />
  {/key}
{/if}
<ChatFooter {card} bind:height={footerHeight} />
