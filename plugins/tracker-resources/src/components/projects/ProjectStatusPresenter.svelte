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
  import { Project, ProjectStatus } from '@hcengineering/tracker'
  import { getClient } from '@hcengineering/presentation'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import tracker from '../../plugin'

  import ProjectStatusSelector from './ProjectStatusSelector.svelte'

  export let value: Project
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = false
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'

  const client = getClient()

  const handleProjectStatusChanged = async (newStatus: ProjectStatus | undefined) => {
    if (!isEditable || newStatus === undefined || value.status === newStatus) {
      return
    }

    await client.update(value, { status: newStatus })
  }
</script>

{#if value}
  <ProjectStatusSelector
    {kind}
    {size}
    {width}
    {justify}
    {isEditable}
    {shouldShowLabel}
    showTooltip={isEditable ? { label: tracker.string.SetStatus } : undefined}
    selectedProjectStatus={value.status}
    onProjectStatusChange={handleProjectStatusChanged}
  />
{/if}
