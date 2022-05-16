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
  import type { Card, CardLabel, LabelsCompactMode } from '@anticrm/board'

  import { getResource } from '@anticrm/platform'
  import preference from '@anticrm/preference'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Button, IconAdd } from '@anticrm/ui'
  import { invokeAction } from '@anticrm/view-resources'

  import board from '../../plugin'
  import { getCardActions } from '../../utils/CardActionUtils'
  import LabelPresenter from '../presenters/LabelPresenter.svelte'

  export let value: Card
  export let isInline: boolean = false

  const client = getClient()
  const query = createQuery()

  let labels: CardLabel[]
  let labelsHandler: (e: Event) => void
  let isHovered: boolean = false
  let modePreference: LabelsCompactMode | undefined

  $: isCompact = isInline ? !!modePreference : false

  $: if (value.labels && value.labels.length > 0) {
    client.findAll(board.class.CardLabel, { _id: { $in: value.labels } }).then((result) => {
      labels = isInline ? result.filter((l) => !l.isHidden) : result
    })
  } else {
    labels = []
  }
  $: query.query(board.class.LabelsCompactMode, { attachedTo: value.space }, (result) => {
    ;[modePreference] = result
  })

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
    if (modePreference) client.remove(modePreference)
    else client.createDoc(board.class.LabelsCompactMode, preference.space.Preference, { attachedTo: value.space })
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

{#if labels && labels.length > 0}
  <div
    class="flex-row-center flex-wrap flex-gap-1 mb-1"
    class:labels-inline-container={isInline}
    on:click={toggleCompact}
    on:mouseover={hoverIn}
    on:focus={hoverIn}
    on:mouseout={hoverOut}
    on:blur={hoverOut}
  >
    {#each labels as label}
      <LabelPresenter
        value={label}
        size={isCompact ? 'tiny' : isInline ? 'x-small' : undefined}
        {isHovered}
        on:click={labelsHandler}
      />
    {/each}
    {#if !isInline}
      <Button icon={IconAdd} kind="no-border" size="large" on:click={labelsHandler} />
    {/if}
  </div>
{/if}
