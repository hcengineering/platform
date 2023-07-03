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
  import { IntlString, getEmbeddedLabel, translate } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Component, Project } from '@hcengineering/tracker'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import { Button, ButtonShape, Label, SelectPopup, eventToHTMLElement, showPopup, themeStore } from '@hcengineering/ui'
  import tracker from '../plugin'

  export let value: Ref<Component> | null | undefined
  export let shouldShowLabel: boolean = true
  export let isEditable: boolean = false
  export let onChange: ((newComponentId: Ref<Component> | undefined) => void) | undefined = undefined
  export let popupPlaceholder: IntlString = tracker.string.AddToComponent
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'
  export let onlyIcon: boolean = false
  export let enlargedText: boolean = false
  export let short: boolean = false
  export let shrink: number = 0
  export let focusIndex: number | undefined = undefined
  export let space: Ref<Project> | undefined = undefined

  let selectedComponent: Component | undefined
  let defaultComponentLabel = ''

  const query = createQuery()
  let rawComponents: Component[] = []
  let loading = true
  $: query.query(
    tracker.class.Component,
    space !== undefined ? { space } : {},
    (res) => {
      rawComponents = res
      loading = false
    },
    {
      sort: { modifiedOn: SortingOrder.Ascending }
    }
  )

  $: handleSelectedComponentIdUpdated(value, rawComponents)

  $: translate(tracker.string.NoComponent, {}, $themeStore.language).then((result) => (defaultComponentLabel = result))
  $: componentText = shouldShowLabel ? selectedComponent?.label ?? defaultComponentLabel : undefined

  const handleSelectedComponentIdUpdated = async (
    newComponentId: Ref<Component> | null | undefined,
    components: Component[]
  ) => {
    if (newComponentId === null || newComponentId === undefined) {
      selectedComponent = undefined

      return
    }

    selectedComponent = components.find((it) => it._id === newComponentId)
  }

  const handleComponentEditorOpened = async (event: MouseEvent): Promise<void> => {
    event.stopPropagation()
    if (!isEditable) {
      return
    }

    const componentsInfo = [
      { id: null, icon: tracker.icon.Components, label: tracker.string.NoComponent, isSelected: !selectedComponent },
      ...rawComponents.map((p) => ({
        id: p._id,
        icon: tracker.icon.Components,
        text: p.label,
        isSelected: selectedComponent ? p._id === selectedComponent._id : false
      }))
    ]

    showPopup(
      SelectPopup,
      { value: componentsInfo, placeholder: popupPlaceholder, searchable: true },
      eventToHTMLElement(event),
      onChange
    )
  }
</script>

{#if onlyIcon || componentText === undefined}
  <Button
    {focusIndex}
    {kind}
    {size}
    {shape}
    {width}
    {justify}
    icon={tracker.icon.Components}
    disabled={!isEditable}
    {loading}
    {short}
    {shrink}
    on:click={handleComponentEditorOpened}
  />
{:else}
  <Button
    {focusIndex}
    {kind}
    {size}
    {shape}
    {width}
    {justify}
    icon={tracker.icon.Components}
    disabled={!isEditable}
    {loading}
    notSelected={!value}
    {short}
    {shrink}
    on:click={handleComponentEditorOpened}
  >
    <svelte:fragment slot="content">
      <span class="label {enlargedText ? 'ml-1 text-base' : 'text-md'} overflow-label pointer-events-none">
        <Label label={getEmbeddedLabel(componentText)} />
      </span>
    </svelte:fragment>
  </Button>
{/if}
