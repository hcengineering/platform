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
  import { Issue, Project, Team } from '@anticrm/tracker'
  import { getClient } from '@anticrm/presentation'
  import type { ButtonKind, ButtonShape, ButtonSize } from '@anticrm/ui'
  import tracker from '../../plugin'
  import ProjectSelector from '../ProjectSelector.svelte'
  import { IntlString } from '@anticrm/platform'

  export let value: Issue
  export let currentSpace: Ref<Team> | undefined = undefined
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = true
  export let popupPlaceholder: IntlString = tracker.string.MoveToProject
  export let shouldShowPlaceholder = true
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'

  const client = getClient()

  const handleProjectIdChanged = async (newProjectId: Ref<Project> | null | undefined) => {
    if (!isEditable || newProjectId === undefined) {
      return
    }

    const currentIssue = await client.findOne(tracker.class.Issue, { space: currentSpace, _id: value._id })

    if (currentIssue === undefined) {
      return
    }

    await client.update(currentIssue, { project: newProjectId })
  }
</script>

{#if value.project || shouldShowPlaceholder}
  <ProjectSelector
    {kind}
    {size}
    {shape}
    {width}
    {justify}
    {isEditable}
    {shouldShowLabel}
    {popupPlaceholder}
    value={value.project}
    onProjectIdChange={handleProjectIdChanged}
  />
{/if}
