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
  import type { Card } from '@anticrm/board'
  import { createQuery, getClient } from '@anticrm/presentation'
  import tags, { TagReference } from '@anticrm/tags'
  import { Button, Icon, IconAdd } from '@anticrm/ui'
  import { invokeAction } from '@anticrm/view-resources'

  import board from '../../plugin'
  import { commonBoardPreference } from '../../utils/BoardUtils'
  import { getCardActions } from '../../utils/CardActionUtils'
  import LabelPresenter from '../presenters/LabelPresenter.svelte'

  export let value: Card
  export let isInline: boolean = false

  const client = getClient()

  let labelsHandler: (e: Event) => void
  let isHovered: boolean = false

  let labels: TagReference[] = []
  const query = createQuery()
  $: query.query(tags.class.TagReference, { attachedTo: value._id }, (result) => {
    labels = result
  })

  $: isCompact = $commonBoardPreference?.cardLabelsCompactMode

  if (!isInline) {
    getCardActions(client, {
      _id: board.action.Labels
    }).then(async (result) => {
      if (result?.[0]) {
        labelsHandler = (e: Event) => invokeAction(value, e, result[0].action, result[0].actionProps)
      }
    })
  }

  function toggleCompact () {
    if (!isInline) return
    client.update($commonBoardPreference, { cardLabelsCompactMode: !isCompact })
  }

  function hoverIn () {
    if (isInline) {
      isHovered = true
    }
  }

  function hoverOut () {
    isHovered = false
  }
</script>

<div
  class="flex mb-1"
  class:labels-inline-container={isInline}
  on:click={toggleCompact}
  on:mouseover={hoverIn}
  on:focus={hoverIn}
  on:mouseout={hoverOut}
  on:blur={hoverOut}
>
  {#if labels && labels.length > 0}
    <div class="flex-row-center flex-wrap flex-gap-1 ml-4">
      {#each labels as label}
        <LabelPresenter
          value={label}
          size={isInline ? (isCompact ? 'tiny' : 'x-small') : undefined}
          {isHovered}
          on:click={labelsHandler}
        />
      {/each}
    </div>
  {:else if !isInline}
    <Button kind="link" size="large" on:click={labelsHandler}>
      <Icon slot="content" icon={IconAdd} size="small" />
    </Button>
  {/if}
</div>
