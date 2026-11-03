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

import {
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type Ref,
  SortingOrder
} from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { MarkupNodeType } from '@hcengineering/text'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import view, {
  MAX_TABLE_ROWS,
  TABLE_METADATA_VERSION,
  TableSourceError,
  tableColumnIds,
  tableRowLimitError,
  tableSnapshotFromMarkup
} from '@hcengineering/view'
import type {
  BuildModelKey,
  Filter,
  ResolvedTableSnapshot,
  TableMetadata,
  TableSource,
  TableSourceMode,
  Viewlet,
  ViewOptions
} from '@hcengineering/view'
import { filtersToQuery, getResultOptions, getResultQuery } from '@hcengineering/view-resources'
import {
  buildTableMetadata,
  buildRelationshipTableMetadata,
  isRelationshipTable,
  type TableMetadataDraft
} from './data/metadataBuilder'
import { tableLanguage } from './data/language'
import {
  buildRelationshipTableMarkdown,
  buildRelationshipTablePropsFromMetadata,
  buildTableData,
  renderMarkdownTable
} from './markdown/tableBuilder'
import { modelToConfig } from './model/tableModel'
import { loadViewletConfig } from './model/viewletLoader'
import type { CopyAsMarkdownTableProps, CopyRelationshipTableAsMarkdownProps } from './types'

function assertRowLimit (count: number): void {
  const error = tableRowLimitError(count)
  if (error !== undefined) throw error
}

/** Rendered markdown, stable identities and canonical values always come from the same build. */
function complete (
  metadata: TableMetadataDraft,
  markdown: string,
  rowIds: string[],
  columnIds: string[],
  source: TableSource
): ResolvedTableSnapshot {
  const table = markdownToMarkup(markdown).content?.find((node) => node.type === MarkupNodeType.table)
  if (markdown.length === 0 || table === undefined) throw new TableSourceError('noColumns')
  const snapshot = tableSnapshotFromMarkup(table, rowIds, columnIds)
  if (snapshot.cells.length !== rowIds.length + 1 || snapshot.cells[0].length !== columnIds.length) {
    throw new Error('Rendered table does not match its row and column identities')
  }
  // Relationship rows are paths through related documents, so their identities travel with the copy.
  const rowIdentities = source.kind === 'relationship' ? { rowIds } : {}
  return { snapshot, markdown, metadata: { ...metadata, version: TABLE_METADATA_VERSION, source, ...rowIdentities } }
}

/**
 * Read chosen rows in full, keeping their order. Rows handed over by a view can be partial: lists
 * load only the fields they group and filter by, which renders as `[object Object]` and broken
 * links. Deleted rows are dropped; archived ones stay, as in a fixed table refresh.
 */
export async function loadFullRows (client: Client, cardClass: Ref<Class<Doc>>, docs: Doc[]): Promise<Doc[]> {
  if (docs.length === 0) return []
  const found = await client.findAll(
    cardClass,
    { _id: { $in: docs.map((doc) => doc._id) } },
    { showArchived: true, limit: docs.length }
  )
  const byId = new Map(found.map((doc) => [doc._id, doc]))
  return docs.flatMap((doc): Doc[] => {
    const full = byId.get(doc._id)
    return full === undefined ? [] : [full]
  })
}

/** Capture a fixed set of documents. */
export async function captureTableSnapshot (
  docs: Doc[],
  props: CopyAsMarkdownTableProps,
  client: Client
): Promise<ResolvedTableSnapshot> {
  // The row limit is checked by the callers: the copy dialog and resolveTableSnapshot.
  props = { ...props, language: tableLanguage(props.language) }
  const data = await buildTableData(docs, { ...props, strictColumns: true }, client)
  const markdown = await renderMarkdownTable(data, client.getHierarchy())
  const metadata = await buildTableMetadata({ ...props, config: data.config }, docs, client)
  return complete(
    metadata,
    markdown,
    docs.map((doc) => doc._id),
    data.columnIds ?? [],
    props.source ?? { kind: 'table', mode: 'fixed' }
  )
}

/** Keep relationship paths distinct even when multiple rows belong to the same root document. */
export async function captureRelationshipSnapshot (
  props: CopyRelationshipTableAsMarkdownProps,
  client: Client
): Promise<ResolvedTableSnapshot> {
  // Related documents can multiply the rows, so the paths are counted here, not the documents.
  assertRowLimit(props.viewModel.length)
  props = { ...props, language: tableLanguage(props.language) }
  const markdown = await buildRelationshipTableMarkdown(props, client.getHierarchy(), props.language, client)
  const counts = new Map<string, number>()
  const rowIds = props.viewModel.map((row) => {
    const docs = row.cells.flatMap((cell) => [cell.parentObject, cell.object])
    const key = JSON.stringify(
      [...new Set(docs.filter((doc): doc is Doc => doc !== undefined).map((doc) => `${doc._class}:${doc._id}`))].sort()
    )
    // Repeated relationship paths are told apart by occurrence, never by their visible values.
    const occurrence = counts.get(key) ?? 0
    counts.set(key, occurrence + 1)
    return JSON.stringify([key, occurrence])
  })
  return complete(
    buildRelationshipTableMetadata(props, props.objects),
    markdown,
    rowIds,
    tableColumnIds(modelToConfig(props.model)),
    props.source ?? { kind: 'relationship', mode: 'fixed' }
  )
}

/** Capture a whole view through the same resolution used by refresh, diff and source preview. */
export async function captureViewSnapshot (
  props: CopyAsMarkdownTableProps,
  source: TableSource,
  client: Client
): Promise<ResolvedTableSnapshot> {
  const base = await buildTableMetadata({ ...props, language: tableLanguage(props.language), source }, [], client)
  return await resolveTableSnapshot({ ...base, version: TABLE_METADATA_VERSION, source }, client)
}

/**
 * Find options that change which rows a query returns or how they are joined; view-only state
 * (limits, projections, totals) is dropped.
 */
export function repeatableOptions (options: FindOptions<Doc> | undefined): FindOptions<Doc> {
  if (options === undefined) return {}
  return {
    ...(options.sort !== undefined ? { sort: options.sort } : {}),
    ...(options.lookup !== undefined ? { lookup: options.lookup } : {}),
    ...(options.associations !== undefined ? { associations: options.associations } : {}),
    ...(options.showArchived !== undefined ? { showArchived: options.showArchived } : {})
  }
}

function sortFrom (viewOptions: ViewOptions | undefined, fallback?: FindOptions<Doc>['sort']): FindOptions<Doc>['sort'] {
  const orderBy = viewOptions?.orderBy
  if (orderBy === undefined) return fallback
  return { [orderBy[0]]: orderBy[1], ...(orderBy[0] === '_id' ? {} : { _id: SortingOrder.Ascending }) }
}

async function findViewlet (client: Client, viewletId: string | undefined): Promise<Viewlet | undefined> {
  return viewletId === undefined
    ? undefined
    : await client.findOne(view.class.Viewlet, { _id: viewletId as Ref<Viewlet> })
}

async function savedViewQuery (
  client: Client,
  cardClass: Ref<Class<Doc>>,
  source: TableSource,
  fallbackViewletId: string | undefined,
  fallbackConfig: Array<string | BuildModelKey> | undefined
): Promise<{
  query: DocumentQuery<Doc>
  options: FindOptions<Doc>
  viewlet: Viewlet | undefined
  viewOptions: ViewOptions | undefined
  config?: Array<string | BuildModelKey>
  filters: string
}> {
  const filtered =
    source.filteredViewId === undefined
      ? undefined
      : await client.findOne(view.class.FilteredView, { _id: source.filteredViewId })
  if (filtered === undefined || (filtered.filterClass !== undefined && filtered.filterClass !== cardClass)) {
    throw new TableSourceError('savedView')
  }
  let query: DocumentQuery<Doc>
  try {
    const filters: unknown = JSON.parse(filtered.filters)
    if (!Array.isArray(filters)) throw new Error('Saved view filters are not a list')
    query = await filtersToQuery(filters as Filter[], source.baseQuery ?? {}, true)
  } catch (error) {
    console.warn('Saved view filters cannot be applied', error)
    throw new TableSourceError('filters')
  }
  const viewOptions = filtered.viewOptions ?? source.viewOptions
  const fits = (candidate: Viewlet | undefined): candidate is Viewlet =>
    candidate !== undefined &&
    (candidate.descriptor === view.viewlet.RelationshipTable) === (source.kind === 'relationship')
  // The viewlet id stored with a saved view can outlive the viewlet. Like the view itself, fall back
  // to the viewlet the table was copied with instead of failing.
  const saved = await findViewlet(client, filtered.viewletId ?? undefined)
  let viewlet: Viewlet | undefined = fits(saved) ? saved : undefined
  if (viewlet === undefined && fallbackViewletId !== undefined && fallbackViewletId !== filtered.viewletId) {
    const fallback = await findViewlet(client, fallbackViewletId)
    viewlet = fits(fallback) ? fallback : undefined
  }
  if (viewlet === undefined && fallbackConfig === undefined) throw new TableSourceError('viewlet')
  let options: FindOptions<Doc> = { ...source.baseOptions }
  let config: Array<string | BuildModelKey> | undefined
  if (viewlet !== undefined) {
    query = await getResultQuery(client.getHierarchy(), query, viewlet.viewOptions?.other, viewOptions)
    options = (await getResultOptions(source.baseOptions ?? {}, viewlet.viewOptions?.other, viewOptions)) ?? options
    config = (await loadViewletConfig(client, client.getHierarchy(), cardClass, viewlet)).config
  }
  return {
    query,
    options: { ...options, sort: sortFrom(viewOptions, options.sort) },
    viewlet,
    viewOptions,
    config,
    filters: filtered.filters
  }
}

/**
 * The single source resolution used by copy (whole view), diff, refresh and source preview.
 * Behaviour depends only on the source mode:
 * - fixed: the copied documents, in copied order, with the copied columns;
 * - savedView: the saved view's current filters, columns and sorting;
 * - frozen: the captured query, columns and sorting.
 * An empty result is a valid table. Sources above {@link MAX_TABLE_ROWS} are refused explicitly.
 */
export async function resolveTableSnapshot (metadata: TableMetadata, client: Client): Promise<ResolvedTableSnapshot> {
  const workspace = getMetadata(presentation.metadata.WorkspaceUuid)
  if (metadata.workspace !== undefined && workspace !== undefined && metadata.workspace !== workspace) {
    throw new TableSourceError('workspace')
  }
  const hierarchy = client.getHierarchy()
  const cardClass = metadata.cardClass as Ref<Class<Doc>>
  if (hierarchy.findClass(cardClass) === undefined) throw new TableSourceError('unavailable')

  const legacy = metadata.version === '1.0'
  if (legacy && metadata.documentIds.length === 0 && metadata.query === undefined) {
    throw new TableSourceError('noSource')
  }
  const relationship = isRelationshipTable(metadata)
  // Legacy tables keep the fixed set they were copied with; only very old query-only tables repeat the query.
  const source: TableSource = legacy
    ? { kind: relationship ? 'relationship' : 'table', mode: metadata.documentIds.length > 0 ? 'fixed' : 'frozen' }
    : (metadata.source as TableSource)
  const mode: TableSourceMode = source.mode

  let viewletId = metadata.viewletId
  let config = metadata.config
  let query: DocumentQuery<Doc>
  let options: FindOptions<Doc> = {}
  let viewOptions = source.viewOptions
  let viewlet: Viewlet | undefined
  let filters = source.filters
  if (mode === 'savedView') {
    const resolved = await savedViewQuery(client, cardClass, source, metadata.viewletId, metadata.config)
    ;({ query, options, viewlet, viewOptions } = resolved)
    viewletId = viewlet?._id ?? viewletId
    config = resolved.config ?? config
    filters = resolved.filters
  } else {
    viewlet = await findViewlet(client, viewletId)
    if (viewlet === undefined && config === undefined && viewletId !== undefined) {
      throw new TableSourceError('viewlet')
    }
    if (mode === 'fixed') {
      query = { _id: { $in: metadata.documentIds as Array<Ref<Doc>> } }
      // Explicitly chosen documents stay in the table even after they are archived.
      options = { showArchived: true }
    } else {
      query = (metadata.query as DocumentQuery<Doc>) ?? {}
      const captured = source.options ?? {}
      options = { ...repeatableOptions(captured), sort: sortFrom(viewOptions, captured.sort) }
    }
  }

  const docs = await client.findAll(cardClass, query, {
    ...options,
    limit: MAX_TABLE_ROWS,
    projection: undefined,
    total: true
  })
  const total = docs.total ?? docs.length
  if (total > docs.length) assertRowLimit(total)
  const rows: Doc[] = [...docs]
  if (mode === 'fixed') {
    const indices = new Map(metadata.documentIds.map((id, index) => [id, index]))
    rows.sort((a, b) => (indices.get(a._id) ?? Infinity) - (indices.get(b._id) ?? Infinity))
  }

  const sourceQuery = mode === 'fixed' ? metadata.query : query
  let result: ResolvedTableSnapshot
  if (relationship) {
    const props = await buildRelationshipTablePropsFromMetadata(
      rows,
      { ...metadata, viewletId, config, query: sourceQuery },
      client
    )
    result = await captureRelationshipSnapshot({ ...props, viewlet, source }, client)
  } else {
    // Headers and values are rendered in the copier's language (metadata.language), not the
    // refreshing user's, so a refresh by a colleague does not show every header as changed.
    result = await captureTableSnapshot(
      rows,
      { cardClass, language: metadata.language, viewlet, config, source, query: sourceQuery },
      client
    )
  }

  const documentIds = rows.map((doc) => doc._id)
  if (legacy) {
    return { ...result, metadata: { ...metadata, documentIds, timestamp: Date.now() } }
  }
  return {
    ...result,
    metadata: {
      ...metadata,
      version: TABLE_METADATA_VERSION,
      viewletId,
      config: result.metadata.config,
      query: sourceQuery,
      source: mode === 'savedView' ? { ...source, viewOptions, filters } : source,
      documentIds,
      timestamp: Date.now(),
      // Transit identities are replaced by the fresh ones (relationship) or dropped.
      rowIds: relationship ? result.snapshot.rowIds : undefined
    }
  }
}
