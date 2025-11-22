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
  import { Class, Doc, DocumentQuery, Ref, type WorkspaceInfoWithStatus } from '@hcengineering/core'
  import presentation, { Card, MessageBox } from '@hcengineering/presentation'
  import { DropdownLabelsIntl, DropdownLabels, EditBox, Label, showPopup } from '@hcengineering/ui'
  import { getMetadata, getResource } from '@hcengineering/platform'
  import login from '@hcengineering/login'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc> | undefined = undefined
  export let selectedDocs: Doc[] = []

  const dispatch = createEventDispatcher()

  type ExportSource = 'all' | 'selected'

  let source: ExportSource = selectedDocs.length > 0 ? 'selected' : 'all'
  let targetWorkspace: string | undefined = undefined
  let targetSpaceName: string = `Export ${new Date().toISOString().split('T')[0]}`
  let workspaces: WorkspaceInfoWithStatus[] = []
  let loading = false

  const sourceItems = [
    { id: 'selected', label: plugin.string.ExportSelected },
    { id: 'all', label: plugin.string.ExportAll }
  ]

  async function loadWorkspaces (): Promise<void> {
    try {
      const getWorkspacesFn = await getResource(login.function.GetWorkspaces)
      workspaces = await getWorkspacesFn()
    } catch (err) {
      console.error('Failed to load workspaces:', err)
    }
  }

  interface WorkspaceItem {
    id: string
    label: string
  }

  $: workspaceItems = workspaces.map(
    (ws): WorkspaceItem => ({
      id: ws.uuid,
      label: ws.name
    })
  )

  $: canSave = targetWorkspace !== undefined && targetSpaceName.trim().length > 0

  async function handleExport (): Promise<void> {
    if (!canSave) return

    loading = true
    try {
      const baseUrl = getMetadata(plugin.metadata.ExportUrl)
      const token = getMetadata(presentation.metadata.Token)
      if (token == null) {
        throw new Error('No token available')
      }

      const body: any = {
        targetWorkspace,
        targetSpace: targetSpaceName.trim(),
        _class
      }

      if (source === 'selected' && selectedDocs.length > 0) {
        body.query = {
          _id: { $in: selectedDocs.map((d) => d._id) }
        }
      } else if (query !== undefined) {
        body.query = query
      }

      const res = await fetch(`${baseUrl}/migrate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        void res.json().catch(() => ({}))
        showPopup(MessageBox, {
          label: plugin.string.ExportRequestFailed,
          kind: 'error',
          message: plugin.string.ExportRequestFailedMessage
        })
        return
      }

      showPopup(MessageBox, {
        label: plugin.string.ExportStarted,
        message: plugin.string.ExportStartedMessage
      })

      dispatch('close', true)
    } catch (err) {
      console.error('Export failed:', err)
      showPopup(MessageBox, {
        label: plugin.string.ExportRequestFailed,
        kind: 'error',
        message: plugin.string.ExportRequestFailedMessage
      })
    } finally {
      loading = false
    }
  }

  void loadWorkspaces()
</script>

<Card
  label={plugin.string.ExportToWorkspace}
  okAction={handleExport}
  okLabel={plugin.string.Export}
  canSave={canSave && !loading}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <div class="flex-col gap-4">
    <div class="flex-col gap-2">
      <Label label={plugin.string.ExportSource} />
      <DropdownLabelsIntl
        items={sourceItems}
        bind:selected={source}
        kind="regular"
        size="large"
        disabled={selectedDocs.length === 0}
      />
      {#if selectedDocs.length === 0}
        <span class="text-sm overflow-label">
          {plugin.string.NoSelectedDocuments}
        </span>
      {/if}
    </div>

    <div class="flex-col gap-2">
      <Label label={plugin.string.TargetWorkspace} />
      <DropdownLabels items={workspaceItems} bind:selected={targetWorkspace} kind="regular" size="large" />
    </div>

    {#if targetWorkspace}
      <div class="flex-col gap-2">
        <Label label={plugin.string.TargetSpaceName} />
        <EditBox bind:value={targetSpaceName} kind="large-style" autoFocus />
        <span class="text-sm overflow-label">
          {plugin.string.TargetSpaceNameHint}
        </span>
      </div>
    {/if}
  </div>
</Card>
