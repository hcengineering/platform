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
  import cardPlugin, { Card, MasterTag } from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { SubscriptionLabelID } from '@hcengineering/communication-types'
  import chat, { chatId } from '@hcengineering/chat'
  import { Navigator } from '@hcengineering/card-resources'
  import communication from '@hcengineering/communication'

  export let card: Card | undefined = undefined
  export let type: Ref<MasterTag> | undefined = undefined
  export let special: 'home' | 'favorites' | string | undefined = undefined

  function getSpecial (special: 'home' | 'favorites' | string | undefined): string | undefined {
    if (special === 'favorites') {
      return 'favorites'
    }
    if (special === 'home') {
      return 'home'
    }
    return undefined
  }
</script>

<Navigator
  config={{
    variant: 'cards',
    types: [cardPlugin.class.Card],
    savedViews: true,
    groupBySpace: false,
    hideEmpty: true,
    limit: 5,
    home: true,
    labelFilter: [SubscriptionLabelID],
    preorder: [
      { type: chat.masterTag.Thread, order: 1 },
      { type: chat.masterTag.Channel, order: 2 },
      { type: communication.type.Direct, order: 3 }
    ],
    fixedTypes: [chat.masterTag.Thread, chat.masterTag.Channel, communication.type.Direct],
    specialSorting: {
      [communication.type.Direct]: 'alphabetical'
    },
    allowCreate: true,
    defaultSorting: 'recent',
    lookback: '2w',
    showTypeIcon: false,
    showCardIcon: true
  }}
  applicationId={chatId}
  selectedType={type}
  selectedCard={card?._id}
  selectedSpecial={getSpecial(special)}
  on:selectType
  on:selectCard
  on:favorites
  on:home
/>
