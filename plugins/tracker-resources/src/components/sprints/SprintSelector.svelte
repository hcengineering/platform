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
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { getEmbeddedLabel, IntlString, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Component, Sprint } from '@hcengineering/tracker'
  import type { ButtonKind, ButtonSize, LabelAndProps } from '@hcengineering/ui'
  import { Button, ButtonShape, eventToHTMLElement, SelectPopup, showPopup, Label } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { sprintStatusAssets } from '../../types'

  export let value: Ref<Sprint> | null | undefined
  export let shouldShowLabel: boolean = true
  export let isEditable: boolean = true
  export let onChange: ((newSprintId: Ref<Sprint> | undefined) => void) | undefined = undefined
  export let popupPlaceholder: IntlString = tracker.string.AddToSprint
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'
  export let onlyIcon: boolean = false
  export let enlargedText: boolean = false
  export let short: boolean = false
  export let focusIndex: number | undefined = undefined

  export let useComponent: Ref<Component> | undefined = undefined
  export let showTooltip: LabelAndProps | undefined = undefined

  let selectedSprint: Sprint | undefined
  let defaultSprintLabel = ''

  const query = createQuery()
  let rawSprints: Sprint[] = []
  query.query(
    tracker.class.Sprint,
    useComponent ? { component: useComponent } : {},
    (res) => {
      rawSprints = res
    },
    {
      sort: { startDate: SortingOrder.Descending }
    }
  )

  $: handleSelectedSprintIdUpdated(value, rawSprints)

  $: translate(tracker.string.NoSprint, {}).then((result) => (defaultSprintLabel = result))
  const sprintIcon = tracker.icon.Sprint
  $: sprintText = shouldShowLabel ? selectedSprint?.label ?? defaultSprintLabel : undefined

  const handleSelectedSprintIdUpdated = async (newSprintId: Ref<Sprint> | null | undefined, sprints: Sprint[]) => {
    if (newSprintId === null || newSprintId === undefined) {
      selectedSprint = undefined

      return
    }

    selectedSprint = sprints.find((it) => it._id === newSprintId)
  }

  const handleSprintEditorOpened = async (event: MouseEvent): Promise<void> => {
    event.stopPropagation()
    if (!isEditable) {
      return
    }

    const sprintInfo = [
      { id: null, icon: tracker.icon.Sprint, label: tracker.string.NoSprint },
      ...rawSprints.map((p) => ({
        id: p._id,
        icon: tracker.icon.Sprint,
        text: p.label,
        category: sprintStatusAssets[p.status]
      }))
    ]

    showPopup(
      SelectPopup,
      { value: sprintInfo, placeholder: popupPlaceholder, searchable: true },
      eventToHTMLElement(event),
      onChange
    )
  }
</script>

{#if onlyIcon || sprintText === undefined}
  <Button
    {focusIndex}
    {kind}
    {size}
    {shape}
    {width}
    {justify}
    {showTooltip}
    icon={sprintIcon}
    disabled={!isEditable}
    {short}
    on:click={handleSprintEditorOpened}
  />
{:else}
  <Button
    {focusIndex}
    {kind}
    {size}
    {shape}
    {width}
    {justify}
    {showTooltip}
    icon={sprintIcon}
    disabled={!isEditable}
    {short}
    on:click={handleSprintEditorOpened}
  >
    <svelte:fragment slot="content">
      <span
        class="{enlargedText ? 'text-base' : 'text-md'} fs-bold overflow-label {!value
          ? 'content-color'
          : 'content-accent-color'} pointer-events-none"
      >
        <Label label={getEmbeddedLabel(sprintText)} />
      </span>
    </svelte:fragment>
  </Button>
{/if}
