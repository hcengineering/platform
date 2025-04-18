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
  import { chatId } from '@hcengineering/chat'
  import { Navigator } from '@hcengineering/card-resources'

  export let card: Card | undefined = undefined
  export let type: Ref<MasterTag> | undefined = undefined
</script>

<Navigator
  config={{
    types: [cardPlugin.class.Card],
    maxDepth: 1,
    groupBySpace: false,
    savedViews: true,
    cardOptions: {
      hideEmptyTypes: true,
      enabled: true,
      limit: 8,
      labelFilter: [SubscriptionLabelID]
    }
  }}
  applicationId={chatId}
  selectedType={type}
  selectedCard={card?._id}
  on:selectType
  on:selectCard
/>
