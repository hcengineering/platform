<!--
//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

-->
<script lang="ts">
  import type { Doc } from '@hcengineering/core'
  import type { CopyAsMarkdownTableProps, CopyRelationshipTableAsMarkdownProps } from '@hcengineering/converter'
  import type { IntlString } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { Button, DropdownLabelsIntl, IconClose, Label, Notice } from '@hcengineering/ui'
  import view, {
    tableRowLimitError,
    tableSourceErrorMessage,
    type ResolvedTableSnapshot,
    type TableSource,
    type TableSourceMode
  } from '@hcengineering/view'
  import { createEventDispatcher, onMount } from 'svelte'
  import { type TableCopyFormat, writeTableToClipboard } from '../markdown/copyActions'
  import { buildRelationshipTablePropsFromMetadata } from '../markdown/tableBuilder'
  import { modelToConfig } from '../model/tableModel'
  import { captureRelationshipSnapshot, captureTableSnapshot, captureViewSnapshot, loadFullRows } from '../trackedTable'

  /** Card class, columns, the query the view ran and its source (see openCopyTableDialog). */
  export let props: CopyAsMarkdownTableProps
  /** Rows the action was invoked on, in view order. */
  export let selected: Doc[] = []
  /** Rows the view has loaded, in view order. */
  export let loaded: Doc[] = []
  export let relationship: CopyRelationshipTableAsMarkdownProps | undefined = undefined
  /** Whether the filters on screen differ from the open saved view (`props.source.filteredViewId`). */
  export let savedViewModified = false

  type Scope = 'selection' | 'loaded' | 'view'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const formatStorageKey = 'tracex.copyTable.format'

  function storedFormat (): TableCopyFormat {
    try {
      return localStorage.getItem(formatStorageKey) === 'markdown' ? 'markdown' : 'tracex'
    } catch {
      return 'tracex'
    }
  }

  let format: TableCopyFormat = storedFormat()
  let scope: Scope = selected.length > 0 ? 'selection' : props.query !== undefined ? 'view' : 'loaded'
  let total: number | undefined
  // An unchanged saved view is followed by default. When the filters on screen differ from it, the
  // default keeps what is shown, so the copy matches the rows the user sees.
  let viewSource: 'savedView' | 'frozen' = savedViewModified ? 'frozen' : 'savedView'
  let savedViewName = ''
  let copying = false
  let error: { label: IntlString, params: Record<string, string | number> } | undefined

  const viewSourceItems = [
    { id: 'savedView', label: view.string.TableSourceLiveSavedView },
    { id: 'frozen', label: view.string.TableSourceAsShown }
  ]

  const formatItems = [
    { id: 'tracex', label: view.string.TraceXTable },
    { id: 'markdown', label: view.string.MarkdownTable }
  ]

  onMount(async () => {
    if (props.query !== undefined) {
      try {
        const result = await client.findAll(props.cardClass, props.query, { limit: 1, total: true })
        total = result.total >= 0 ? result.total : undefined
      } catch (err) {
        console.warn('Failed to count table rows', err)
      }
    }
    if (props.source?.filteredViewId !== undefined) {
      try {
        const filtered = await client.findOne(view.class.FilteredView, { _id: props.source.filteredViewId })
        savedViewName = filtered?.name ?? ''
      } catch (err) {
        console.warn('Failed to load the saved view name', err)
      }
    }
  })

  // "Loaded rows" is only a distinct choice while the view has not loaded everything.
  $: showLoaded =
    loaded.length > 0 && loaded.length !== selected.length && (total === undefined || loaded.length < total)
  $: scopeItems = [
    ...(selected.length > 0
      ? [{ id: 'selection', label: view.string.SelectedRows, params: { count: selected.length } }]
      : []),
    ...(showLoaded ? [{ id: 'loaded', label: view.string.LoadedRows, params: { count: loaded.length } }] : []),
    ...(props.query !== undefined
      ? [
          knownTotal === undefined
            ? { id: 'view', label: view.string.EntireView }
            : { id: 'view', label: view.string.EntireViewCount, params: { count: knownTotal } }
        ]
      : [])
  ]
  $: rows = scope === 'selection' ? selected : loaded
  $: hasSavedView = props.source?.filteredViewId !== undefined
  $: mode = (
    scope !== 'view' ? 'fixed' : hasSavedView && viewSource === 'savedView' ? 'savedView' : 'frozen'
  ) as TableSourceMode
  // The count on screen reflects the current filters, not the saved ones it would be copied with.
  $: knownTotal = mode === 'savedView' && savedViewModified ? undefined : total
  // Copies above the limit could not be refreshed later, so they are refused up front for every scope.
  $: rowCount = scope === 'view' ? knownTotal : rows.length
  $: rowLimitError = rowCount === undefined ? undefined : tableRowLimitError(rowCount)
  $: tooLarge = rowLimitError !== undefined
  $: hint =
    format === 'markdown'
      ? { label: view.string.MarkdownTableHint, params: {} }
      : mode === 'fixed'
        ? { label: view.string.TableModeFixedHint, params: { count: rows.length } }
        : mode === 'savedView'
          ? {
              label: savedViewModified
                ? view.string.TableModeSavedViewModifiedHint
                : view.string.TableModeSavedViewHint,
              params: { name: savedViewName }
            }
          : { label: view.string.TableModeFrozenHint, params: {} }
  $: notice = tooLarge ? tableSourceErrorMessage(rowLimitError) : error
  $: canCopy = !copying && !tooLarge && (scope === 'view' || rows.length > 0)

  function sourceFor (selectedMode: TableSourceMode): TableSource {
    const kind = relationship === undefined ? 'table' : 'relationship'
    if (selectedMode === 'fixed') return { kind, mode: 'fixed' }
    const { filteredViewId, baseQuery, baseOptions, ...rest } = props.source ?? { kind, mode: selectedMode }
    return selectedMode === 'savedView'
      ? { ...rest, kind, mode: selectedMode, filteredViewId, baseQuery, baseOptions }
      : { ...rest, kind, mode: selectedMode }
  }

  async function resolve (): Promise<ResolvedTableSnapshot> {
    const source = sourceFor(mode)
    const config = relationship === undefined ? props.config : modelToConfig(relationship.model)
    if (scope === 'view') return await captureViewSnapshot({ ...props, config }, source, client)
    const docs = await loadFullRows(client, props.cardClass, rows)
    if (relationship === undefined) return await captureTableSnapshot(docs, { ...props, source }, client)
    const rebuilt = await buildRelationshipTablePropsFromMetadata(docs, { cardClass: props.cardClass, config }, client)
    return await captureRelationshipSnapshot({ ...rebuilt, viewlet: props.viewlet, source }, client)
  }

  async function copy (): Promise<void> {
    if (!canCopy) return
    copying = true
    error = undefined
    try {
      await writeTableToClipboard(await resolve(), format)
      try {
        localStorage.setItem(formatStorageKey, format)
      } catch {}
      dispatch('close')
    } catch (err) {
      console.error('Failed to copy table', err)
      error = tableSourceErrorMessage(err)
    } finally {
      copying = false
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="antiPopup popup"
  on:keydown={(event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void copy()
  }}
>
  <div class="flex-between flex-gap-4 mb-6">
    <span class="fs-title"><Label label={view.string.CopyAsMarkdownTable} /></span>
    <Button
      icon={IconClose}
      kind="ghost"
      size="small"
      showTooltip={{ label: presentation.string.Close }}
      on:click={() => dispatch('close')}
    />
  </div>

  <div class="flex-col flex-gap-4">
    <div class="flex-between flex-gap-4">
      <span class="font-medium caption-color"><Label label={view.string.TableFormat} /></span>
      <div class="control">
        <DropdownLabelsIntl
          items={formatItems}
          bind:selected={format}
          disabled={copying}
          size="medium"
          width="100%"
          justify="left"
        />
      </div>
    </div>
    <div class="flex-between flex-gap-4">
      <span class="font-medium caption-color"><Label label={view.string.TableRows} /></span>
      <div class="control">
        <DropdownLabelsIntl
          items={scopeItems}
          bind:selected={scope}
          disabled={copying}
          size="medium"
          width="100%"
          justify="left"
        />
      </div>
    </div>
    {#if scope === 'view' && hasSavedView}
      <div class="flex-between flex-gap-4">
        <span class="font-medium caption-color"><Label label={view.string.TableSource} /></span>
        <div class="control">
          <DropdownLabelsIntl
            items={viewSourceItems}
            bind:selected={viewSource}
            disabled={copying}
            size="medium"
            width="100%"
            justify="left"
          />
        </div>
      </div>
    {/if}
  </div>

  <span class="text-md content-dark-color mt-6"><Label label={hint.label} params={hint.params} /></span>

  {#if notice !== undefined}
    <div class="mt-4"><Notice kind="error" label={notice.label} params={notice.params} /></div>
  {/if}

  <div class="flex-row-center flex-gap-2 justify-end mt-9">
    <Button
      label={view.string.CopyToClipboard}
      size="medium"
      kind="primary"
      loading={copying}
      disabled={!canCopy}
      on:click={() => void copy()}
    />
  </div>
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1.75rem;
    width: 30rem;
    max-width: 40rem;
    background: var(--popup-bg-color);
    border-radius: 1.25rem;
    box-shadow: var(--popup-shadow);
  }

  .control {
    width: 14rem;
    flex-shrink: 0;
  }
</style>
