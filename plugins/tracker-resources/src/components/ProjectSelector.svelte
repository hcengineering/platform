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
  import { translate } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Button, showPopup, SelectPopup, eventToHTMLElement } from '@anticrm/ui'
  import type { ButtonKind, ButtonSize } from '@anticrm/ui'
  import tracker from '../plugin'

  export let value: Ref<Project> | null | undefined
  export let projects: Project[] = []
  export let shouldShowLabel: boolean = true
  export let isEditable: boolean = true
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'

  const client = getClient()

  let selectedProject: Project | undefined
  let defaultProjectLabel = ''

  $: if (value !== undefined) {
    handleSelectedProjectUpdated(value)
  }

  $: translate(tracker.string.Project, {}).then((result) => (defaultProjectLabel = result))
  $: projectIcon = selectedProject?.icon ?? tracker.icon.Projects
  $: projectLabel = selectedProject?.label ?? defaultProjectLabel

  $: projectsInfo = [
    { id: null, icon: tracker.icon.Projects, label: tracker.string.NoProject },
    ...projects.map((p) => ({
      id: p._id,
      icon: p.icon,
      text: p.label
    }))
  ]

  const handleSelectedProjectUpdated = async (value: Ref<Project> | null) => {
    if (value === null) {
      selectedProject = undefined

      return
    }

    selectedProject = await client.findOne(tracker.class.Project, { _id: value })
  }

  const handleProjectChanged = (newProject: Ref<Project> | undefined) => {
    if (newProject !== undefined && newProject !== value) {
      value = newProject
    }
  }

  const handlePriorityEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }

    showPopup(
      SelectPopup,
      { value: projectsInfo, placeholder: tracker.string.AddToProject, searchable: true },
      eventToHTMLElement(event),
      handleProjectChanged
    )
  }
</script>

<Button icon={projectIcon} {justify} {width} {size} {kind} disabled={!isEditable} on:click={handlePriorityEditorOpened}>
  <svelte:fragment slot="content">
    {#if shouldShowLabel}
      <span class="nowrap">{projectLabel}</span>
    {/if}
  </svelte:fragment>
</Button>
