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
  import { ProjectStatus } from '@anticrm/tracker'
  import { Button, showPopup, SelectPopup, eventToHTMLElement } from '@anticrm/ui'
  import type { ButtonKind, ButtonSize, LabelAndProps } from '@anticrm/ui'
  import tracker from '../../plugin'
  import { defaultProjectStatuses, projectStatusAssets } from '../../utils'

  export let selectedProjectStatus: ProjectStatus | undefined
  export let shouldShowLabel: boolean = true
  export let onProjectStatusChange: ((newProjectStatus: ProjectStatus | undefined) => void) | undefined = undefined
  export let isEditable: boolean = true

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'
  export let showTooltip: LabelAndProps | undefined = undefined

  $: selectedStatusIcon = selectedProjectStatus
    ? projectStatusAssets[selectedProjectStatus].icon
    : tracker.icon.ProjectStatusBacklog

  $: selectedStatusLabel = shouldShowLabel
    ? selectedProjectStatus
      ? projectStatusAssets[selectedProjectStatus].label
      : tracker.string.Backlog
    : undefined

  $: statusesInfo = defaultProjectStatuses.map((s) => ({ id: s, ...projectStatusAssets[s] }))

  const handleProjectStatusEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }
    showPopup(
      SelectPopup,
      { value: statusesInfo, placeholder: tracker.string.SetStatus, searchable: true },
      eventToHTMLElement(event),
      onProjectStatusChange
    )
  }
</script>

<Button
  {kind}
  {size}
  {width}
  {justify}
  disabled={!isEditable}
  icon={selectedStatusIcon}
  label={selectedStatusLabel}
  {showTooltip}
  on:click={handleProjectStatusEditorOpened}
/>
