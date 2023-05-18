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
  import { ComponentStatus } from '@hcengineering/tracker'
  import { Button, showPopup, SelectPopup, eventToHTMLElement, Icon } from '@hcengineering/ui'
  import type { ButtonKind, ButtonSize, LabelAndProps } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { defaultComponentStatuses, componentStatusAssets } from '../../utils'

  export let selectedComponentStatus: ComponentStatus | undefined
  export let shouldShowLabel: boolean = true
  export let onComponentStatusChange: ((newComponentStatus: ComponentStatus | undefined) => void) | undefined =
    undefined
  export let isEditable: boolean = true

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'
  export let showTooltip: LabelAndProps | undefined = undefined

  $: selectedStatusIcon = selectedComponentStatus
    ? componentStatusAssets[selectedComponentStatus].icon
    : tracker.icon.ComponentStatusBacklog

  $: selectedStatusLabel = shouldShowLabel
    ? selectedComponentStatus
      ? componentStatusAssets[selectedComponentStatus].label
      : tracker.string.Backlog
    : undefined

  $: statusesInfo = defaultComponentStatuses.map((s) => ({
    id: s,
    isSelected: componentStatusAssets[s].label === selectedStatusLabel,
    ...componentStatusAssets[s]
  }))

  const handleComponentStatusEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }
    showPopup(
      SelectPopup,
      { value: statusesInfo, placeholder: tracker.string.SetStatus, searchable: true },
      eventToHTMLElement(event),
      onComponentStatusChange
    )
  }
</script>

{#if kind === 'list'}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="flex-no-shrink clear-mins cursor-pointer content-pointer-events-none"
    on:click={handleComponentStatusEditorOpened}
  >
    <Icon icon={selectedStatusIcon} {size} />
  </div>
{:else}
  <Button
    {kind}
    {size}
    {width}
    {justify}
    disabled={!isEditable}
    icon={selectedStatusIcon}
    label={selectedStatusLabel}
    {showTooltip}
    on:click={handleComponentStatusEditorOpened}
  />
{/if}
