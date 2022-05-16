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
  import { Ref } from '@anticrm/core'
  import { Project } from '@anticrm/tracker'
  import { IntlString, translate } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Button, showPopup, SelectPopup, eventToHTMLElement, ButtonShape } from '@anticrm/ui'
  import type { ButtonKind, ButtonSize } from '@anticrm/ui'
  import tracker from '../plugin'

  export let value: Ref<Project> | null | undefined
  export let projects: Project[] = []
  export let shouldShowLabel: boolean = true
  export let isEditable: boolean = true
  export let onProjectIdChange: ((newProjectId: Ref<Project> | undefined) => void) | undefined = undefined
  export let popupPlaceholder: IntlString = tracker.string.AddToProject
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'

  const client = getClient()

  let selectedProject: Project | undefined
  let defaultProjectLabel = ''

  $: if (value !== undefined) {
    handleSelectedProjectIdUpdated(value)
  }

  $: translate(tracker.string.Project, {}).then((result) => (defaultProjectLabel = result))
  $: projectIcon = selectedProject?.icon ?? tracker.icon.Projects
  $: projectText = shouldShowLabel ? selectedProject?.label ?? defaultProjectLabel : undefined

  $: projectsInfo = [
    { id: null, icon: tracker.icon.Projects, label: tracker.string.NoProject },
    ...projects.map((p) => ({
      id: p._id,
      icon: p.icon,
      text: p.label
    }))
  ]

  const handleSelectedProjectIdUpdated = async (newProjectId: Ref<Project> | null) => {
    if (newProjectId === null) {
      selectedProject = undefined

      return
    }

    selectedProject = await client.findOne(tracker.class.Project, { _id: newProjectId })
  }

  const handlePriorityEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }

    showPopup(
      SelectPopup,
      { value: projectsInfo, placeholder: popupPlaceholder, searchable: true },
      eventToHTMLElement(event),
      onProjectIdChange
    )
  }
</script>

<Button
  {kind}
  {size}
  {shape}
  {width}
  {justify}
  icon={projectIcon}
  disabled={!isEditable}
  on:click={handlePriorityEditorOpened}
>
  <svelte:fragment slot="content">
    {#if projectText}
      <span class="nowrap">{projectText}</span>
    {/if}
  </svelte:fragment>
</Button>
