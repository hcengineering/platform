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
  import { permissionsStore } from '@hcengineering/contact-resources'
  import { DocumentQuery, Ref, SortingOrder } from '@hcengineering/core'
  import { IntlString, getEmbeddedLabel, translateCB } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Milestone } from '@hcengineering/tracker'
  import type { ButtonKind, ButtonSize, LabelAndProps, PopupResult } from '@hcengineering/ui'
  import {
    Button,
    ButtonShape,
    IconAdd,
    Label,
    SelectPopup,
    eventToHTMLElement,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { milestoneStatusAssets } from '../../types'
  import { canCreateMilestone } from './milestonePermissions'
  import NewMilestone from './NewMilestone.svelte'

  export let value: Ref<Milestone> | null | undefined
  export let space: DocumentQuery<Milestone>['space'] | undefined = undefined
  export let shouldShowLabel: boolean = true
  export let isEditable: boolean = true
  export let onChange: ((newMilestoneId: Ref<Milestone> | undefined) => void) | undefined = undefined
  export let popupPlaceholder: IntlString = tracker.string.AddToMilestone
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'
  export let onlyIcon: boolean = false
  export let enlargedText: boolean = false
  export let short: boolean = false
  export let focusIndex: number | undefined = undefined
  export let isAction: boolean = false

  export let showTooltip: LabelAndProps | undefined = undefined

  let selectedMilestone: Milestone | undefined
  let defaultMilestoneLabel = ''

  const query = createQuery()
  let rawMilestones: Milestone[] = []
  $: query.query(
    tracker.class.Milestone,
    space ? { space } : {},
    (res) => {
      rawMilestones = res
    },
    {
      sort: { status: SortingOrder.Ascending, targetDate: SortingOrder.Descending }
    }
  )

  $: handleSelectedMilestoneIdUpdated(value, rawMilestones)

  $: translateCB(tracker.string.Milestone, {}, $themeStore.language, (result) => (defaultMilestoneLabel = result))
  const milestoneIcon = tracker.icon.Milestone
  $: milestoneText = shouldShowLabel ? (selectedMilestone?.label ?? defaultMilestoneLabel) : undefined

  const handleSelectedMilestoneIdUpdated = async (
    newMilestoneId: Ref<Milestone> | null | undefined,
    milestones: Milestone[]
  ) => {
    if (newMilestoneId === null || newMilestoneId === undefined) {
      selectedMilestone = undefined

      return
    }

    selectedMilestone = milestones.find((it) => it._id === newMilestoneId)
  }

  const createMilestoneId = '#createMilestone'
  // A new milestone can be created only when the selector is bound to a single project
  $: canCreate = canCreateMilestone(space, isEditable, isAction, $permissionsStore)

  const getMilestoneInfo = (rawMilestones: Milestone[], sp: Milestone | undefined, canCreate: boolean) => {
    return [
      {
        id: null,
        icon: tracker.icon.Milestone,
        label: tracker.string.NoMilestone,
        isSelected: sp === undefined
      },
      ...(canCreate ? [{ id: createMilestoneId, icon: IconAdd, label: tracker.string.NewMilestone }] : []),
      ...rawMilestones.map((p) => ({
        id: p._id,
        icon: tracker.icon.Milestone,
        text: p.label,
        isSelected: sp ? p._id === sp._id : false,
        category: milestoneStatusAssets[p.status]
      }))
    ]
  }

  $: milestones = getMilestoneInfo(rawMilestones, selectedMilestone, canCreate)

  const client = getClient()

  function createMilestone (): void {
    if (!canCreate || typeof space !== 'string') return
    const project = space
    showPopup(NewMilestone, { space: project }, 'top', async (milestoneId: Ref<Milestone> | undefined) => {
      if (milestoneId == null) return
      // The project can be changed inside the dialog, select the milestone only if it belongs to our project
      const milestone = await client.findOne(tracker.class.Milestone, { _id: milestoneId })
      if (milestone?.space === project) {
        onChange?.(milestoneId)
      }
    })
  }

  let milestonePopup: PopupResult | undefined
  const handleMilestoneEditorOpened = async (event: MouseEvent): Promise<void> => {
    event.stopPropagation()
    if (!isEditable) {
      return
    }

    milestonePopup = showPopup(
      SelectPopup,
      { value: milestones, placeholder: popupPlaceholder, searchable: true },
      eventToHTMLElement(event),
      (evt) => {
        milestonePopup = undefined
        if (evt === createMilestoneId) {
          createMilestone()
          return
        }
        onChange?.(evt)
      }
    )
  }

  $: milestonePopup?.update({ value: milestones })
</script>

{#if isAction}
  <SelectPopup
    value={milestones}
    placeholder={popupPlaceholder}
    searchable
    on:close={(evt) => {
      if (onChange !== undefined) onChange(evt.detail)
    }}
  />
{:else if onlyIcon || milestoneText === undefined}
  <Button
    id="milestone"
    {focusIndex}
    {kind}
    {size}
    {shape}
    {width}
    {justify}
    {showTooltip}
    icon={milestoneIcon}
    disabled={!isEditable}
    {short}
    on:click={handleMilestoneEditorOpened}
  />
{:else}
  <Button
    id="milestone"
    {focusIndex}
    {kind}
    {size}
    {shape}
    {width}
    {justify}
    {showTooltip}
    icon={milestoneIcon}
    disabled={!isEditable}
    notSelected={!value}
    {short}
    on:click={handleMilestoneEditorOpened}
  >
    <svelte:fragment slot="content">
      <span class="label {enlargedText ? 'text-base' : 'text-md'} overflow-label pointer-events-none">
        <Label label={getEmbeddedLabel(milestoneText)} />
      </span>
    </svelte:fragment>
  </Button>
{/if}
