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
  import {
    Doc,
    DocumentQuery,
    type WorkspaceInfoWithStatus,
    isActiveMode,
    type WorkspaceUuid,
    WorkspaceAccountPermission,
    type Ref,
    type Space,
    type Class
  } from '@hcengineering/core'
  import { Card, getCurrentWorkspaceUuid } from '@hcengineering/presentation'
  import { DropdownLabels, DropdownLabelsIntl, Label } from '@hcengineering/ui'
  import { getResource } from '@hcengineering/platform'
  import login from '@hcengineering/login'
  import { type RelationDefinition, shouldSkipDocument, isEffectiveDocument } from '@hcengineering/export'

  import { createEventDispatcher } from 'svelte'

  import plugin from '../plugin'
  import { exportToWorkspace } from '../export'

  export let query: DocumentQuery<Doc> | undefined = undefined
  export let value: Doc | Doc[] | Space
  export let relations: RelationDefinition[] | undefined = undefined
  export let docClass: Ref<Class<Doc>> | undefined = undefined
  export let spaceExport: boolean | undefined = false

  const dispatch = createEventDispatcher()

  let targetWorkspace: string | undefined = undefined
  let workspaces: WorkspaceInfoWithStatus[] = []
  let workspacesWithPermission = new Set<WorkspaceUuid>()
  let loading = false
  let workspaceLoading = false

  type ExportFilterMode = 'effectiveOnly' | 'skipArchivedObsolete' | 'all'
  let exportFilterMode: ExportFilterMode = 'effectiveOnly'

  const exportFilterItems = [
    { id: 'effectiveOnly' as const, label: plugin.string.ExportFilterEffectiveOnly },
    { id: 'skipArchivedObsolete' as const, label: plugin.string.ExportFilterSkipArchivedObsolete },
    { id: 'all' as const, label: plugin.string.ExportFilterAll }
  ]

  $: selectedDocs = spaceExport !== true ? (Array.isArray(value) ? value : value != null ? [value] : []) : []
  $: _class = docClass ?? (selectedDocs.length > 0 ? selectedDocs[0]._class : undefined)

  function filterDocsForExport (docs: Doc[], exportFilterMode: ExportFilterMode): Doc[] {
    if (docs.length === 0) return docs
    if (exportFilterMode === 'effectiveOnly') return docs.filter((doc) => isEffectiveDocument(doc))
    if (exportFilterMode === 'skipArchivedObsolete') return docs.filter((doc) => !shouldSkipDocument(doc))
    return docs
  }

  $: filteredSelectedDocs = filterDocsForExport(selectedDocs, exportFilterMode)

  // Build query with space filter when exporting from space
  $: exportQuery = spaceExport === true ? { ...(query ?? {}), space: (value as Space)._id } : query

  async function loadWorkspaces (): Promise<void> {
    try {
      workspaceLoading = true
      const getWorkspacesFn = await getResource(login.function.GetWorkspaces)
      const allWorkspaces = (await getWorkspacesFn()).filter((ws) => isActiveMode(ws.mode))

      // Get workspaces where user has ImportDocument permission
      try {
        const getWorkspacePermissionsFn = await getResource(login.function.GetWorkspacePermissions as any)
        const workspaceUuids = await (getWorkspacePermissionsFn as (permission: string) => Promise<WorkspaceUuid[]>)(
          WorkspaceAccountPermission.ImportDocument
        )
        workspacesWithPermission = new Set<WorkspaceUuid>(workspaceUuids)
      } catch (err) {
        console.error('Failed to load workspace permissions:', err)
        // If we can't load permissions, don't filter (show all workspaces)
        workspacesWithPermission = new Set<WorkspaceUuid>(allWorkspaces.map((ws) => ws.uuid))
      }

      // Filter to only show workspaces where user has ImportDocument permission
      workspaces = allWorkspaces.filter((ws) => workspacesWithPermission.has(ws.uuid))
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

  $: canSave =
    targetWorkspace !== undefined && _class != null && (spaceExport === true || filteredSelectedDocs.length > 0)

  async function handleExport (): Promise<void> {
    if (!canSave || _class == null) return

    loading = true
    void exportToWorkspace(
      _class,
      exportQuery,
      filteredSelectedDocs,
      targetWorkspace,
      relations,
      exportFilterMode === 'skipArchivedObsolete',
      exportFilterMode === 'effectiveOnly'
    )
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
  width="small"
  on:close={() => dispatch('close')}
  on:changeContent
>
  <div class="flex-col gap-2">
    <span class="pl-2 pb-4 secondary-textColor">
      {#if !workspaceLoading && workspaces.length === 0}
        <Label label={plugin.string.RequestPermissionToImport} />
      {:else if spaceExport === true}
        <Label label={plugin.string.SelectWorkspaceToExportSpace} />
      {:else}
        <Label label={plugin.string.SelectWorkspaceToExport} params={{ count: filteredSelectedDocs.length }} />
      {/if}
    </span>
    <DropdownLabels
      placeholder={plugin.string.TargetWorkspace}
      items={workspaceItems}
      bind:selected={targetWorkspace}
      autoSelect={false}
      loading={workspaceLoading}
      disabled={workspaces.length === 0}
      kind="regular"
      size="large"
    />
    <span class="pl-2 py-4 secondary-textColor">
      <Label label={plugin.string.ExportFilterMode} />
    </span>
    <DropdownLabelsIntl items={exportFilterItems} bind:selected={exportFilterMode} kind="regular" size="large" />
  </div>
</Card>
