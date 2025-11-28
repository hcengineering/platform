<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Doc, DocumentQuery, type WorkspaceInfoWithStatus, isActiveMode } from '@hcengineering/core'
  import { Card, getCurrentWorkspaceUuid } from '@hcengineering/presentation'
  import { DropdownLabels } from '@hcengineering/ui'
  import { getResource } from '@hcengineering/platform'
  import login from '@hcengineering/login'
  import { type RelationDefinition } from '@hcengineering/export'

  import { createEventDispatcher } from 'svelte'

  import plugin from '../plugin'
  import { exportToWorkspace } from '../export'

  export let query: DocumentQuery<Doc> | undefined = undefined
  export let value: Doc | Doc[]
  export let relations: RelationDefinition[] | undefined = undefined

  $: selectedDocs = Array.isArray(value) ? value : value != null ? [value] : []
  $: _class = selectedDocs.length > 0 ? selectedDocs[0]._class : undefined

  const dispatch = createEventDispatcher()

  let targetWorkspace: string | undefined = undefined
  let workspaces: WorkspaceInfoWithStatus[] = []
  let loading = false
  let workspaceLoading = false

  async function loadWorkspaces (): Promise<void> {
    try {
      workspaceLoading = true
      const getWorkspacesFn = await getResource(login.function.GetWorkspaces)
      workspaces = (await getWorkspacesFn()).filter((ws) => isActiveMode(ws.mode))
    } catch (err) {
      console.error('Failed to load workspaces:', err)
    } finally {
      workspaceLoading = false
    }
  }

  interface WorkspaceItem {
    id: string
    label: string
  }

  $: workspaceItems = workspaces
    .filter((ws) => ws.uuid !== getCurrentWorkspaceUuid())
    .map(
      (ws): WorkspaceItem => ({
        id: ws.uuid,
        label: ws.name
      })
    )

  $: canSave = targetWorkspace !== undefined && _class != null

  async function handleExport (): Promise<void> {
    if (!canSave || _class == null) return

    loading = true
    await exportToWorkspace(_class, query, selectedDocs, targetWorkspace, relations)
    loading = false
    dispatch('close', true)
  }

  void loadWorkspaces()
</script>

<Card
  label={plugin.string.ExportToWorkspace}
  okAction={handleExport}
  okLabel={plugin.string.Export}
  canSave={canSave && !loading && !workspaceLoading}
  width="x-small"
  on:close={() => dispatch('close')}
  on:changeContent
>
  <div class="flex-col gap-2">
    <DropdownLabels
      placeholder={plugin.string.TargetWorkspace}
      items={workspaceItems}
      bind:selected={targetWorkspace}
      autoSelect={false}
      loading={workspaceLoading}
      kind="regular"
      size="large"
    />
  </div>
</Card>
