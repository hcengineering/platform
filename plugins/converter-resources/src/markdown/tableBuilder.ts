//
// Copyright © 2026 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
//

import core, { type Class, type Client, type Doc, type Hierarchy, type Ref, type PersonId } from '@hcengineering/core'
import { type MarkupNode, MarkupNodeType } from '@hcengineering/text'
import { markdownToMarkup, markupToMarkdown } from '@hcengineering/text-markdown'
import { tableLanguage } from '../data/language'
import type { AttributeModel, BuildMarkdownTableMetadata, Viewlet, BuildModelKey } from '@hcengineering/view'
import viewPlugin, { TableSourceError, tableColumnIds } from '@hcengineering/view'
import { buildConfigLookup, buildModel, getAttributeValue, buildConfigAssociation } from '@hcengineering/view-resources'
import type { CopyAsMarkdownTableProps, CopyRelationshipTableAsMarkdownProps, TableData } from '../types'
import { formatValue, type ElementFormatter } from '../formatter'
import { generateHeaders, loadViewletConfig, buildTableModel } from '../model'
import { rebuildRelationshipTableViewModel, isRelationshipTable } from '../data'
import { escapeMarkdownTableCellContent } from './escape'
import { createMarkdownLink } from './link'

function markdownToTableCellContent (markdown: string): MarkupNode[] {
  const content = markdownToMarkup(markdown).content
  if (content !== undefined && content.length > 0) {
    return content
  }

  return [{ type: MarkupNodeType.paragraph, content: [] }]
}

function buildRelationshipTableMarkup (headers: string[], rows: MarkupNode[]): MarkupNode {
  const headerRow: MarkupNode = {
    type: MarkupNodeType.table_row,
    content: headers.map((header) => ({
      type: MarkupNodeType.table_header,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: header.length > 0 ? [{ type: MarkupNodeType.text, text: header }] : []
        }
      ]
    }))
  }

  return {
    type: MarkupNodeType.doc,
    content: [
      {
        type: MarkupNodeType.table,
        content: [headerRow, ...rows]
      }
    ]
  }
}

async function preloadRefLookups (
  docs: Doc[],
  model: AttributeModel[],
  hierarchy: Hierarchy,
  client: Client
): Promise<void> {
  const refAttrs = model.filter((attr) => {
    const a = attr.attribute as any
    if (a?.type === undefined || a.type === null) return false
    const t = a.type
    if (t._class === core.class.RefTo) return true
    if (t._class === core.class.ArrOf && t.of?._class === core.class.RefTo) return true
    return false
  })

  if (refAttrs.length === 0) return

  for (const attr of refAttrs) {
    const a = attr.attribute as any
    const t = a.type
    const isArray = t._class === core.class.ArrOf
    const refType = isArray ? t.of : t
    const targetClass = refType.to as Ref<Class<Doc>>

    const idSet = new Set<string>()
    for (const doc of docs) {
      const raw = getAttributeValue(attr, doc, hierarchy)
      if (raw === undefined || raw === null) continue
      if (Array.isArray(raw)) {
        for (const v of raw) {
          if (typeof v === 'string' && v.trim() !== '') idSet.add(v)
        }
      } else if (typeof raw === 'string' && raw.trim() !== '') {
        idSet.add(raw)
      }
    }

    if (idSet.size === 0) continue

    const ids = Array.from(idSet)
    const refDocs = await client.findAll(targetClass, { _id: { $in: ids as any } })
    const byId = new Map<string, Doc>()
    for (const d of refDocs) {
      byId.set(d._id, d)
    }

    for (const doc of docs) {
      const raw = getAttributeValue(attr, doc, hierarchy)
      if (raw === undefined || raw === null) continue
      const cardWithLookup = doc as any
      cardWithLookup.$lookup ??= {}
      if (isArray && Array.isArray(raw)) {
        const resolved = raw
          .map((v: any) => (typeof v === 'string' ? byId.get(v) : undefined))
          .filter((v): v is Doc => v !== undefined)
        if (resolved.length > 0) {
          cardWithLookup.$lookup[a.name] = resolved
        }
      } else if (!isArray && typeof raw === 'string') {
        const resolved = byId.get(raw)
        if (resolved !== undefined) {
          cardWithLookup.$lookup[a.name] = resolved
        }
      }
    }
  }
}

async function preloadAssociations (docs: Doc[], model: AttributeModel[], client: Client): Promise<void> {
  const associationQueries = buildConfigAssociation(model.map((m) => m.key))
  if (associationQueries === undefined || associationQueries.length === 0) return

  const ids = docs.map((d) => d._id)
  const firstDoc = docs[0]
  if (firstDoc === undefined) return

  try {
    const refreshedDocs = await client.findAll(
      firstDoc._class,
      { _id: { $in: ids as any } },
      {
        associations: associationQueries
      }
    )

    const refreshedMap = new Map(refreshedDocs.map((d) => [d._id, d]))

    for (const doc of docs) {
      const refreshed = refreshedMap.get(doc._id)
      if (refreshed !== undefined) {
        ;(doc as any).$associations = (refreshed as any).$associations
      }
    }
  } catch (error) {
    console.warn('Failed to preload associations for markdown table', error)
  }
}

function collectRelationshipDocsForRefPreload (
  props: CopyRelationshipTableAsMarkdownProps,
  hierarchy: Hierarchy
): Doc[] {
  const byId = new Map<string, Doc>()
  const add = (d: Doc | undefined): void => {
    if (d !== undefined) byId.set(d._id, d)
  }

  for (const o of props.objects) add(o)
  for (const row of props.viewModel) {
    for (const cell of row.cells) {
      add(cell.object)
      add(cell.parentObject)
      const isAssociationKey = cell.attribute.key.startsWith('$associations')
      if (isAssociationKey && cell.object !== undefined) {
        const raw = getAttributeValue(cell.attribute, cell.object, hierarchy)
        if (raw !== undefined && raw !== null && typeof raw === 'object' && '_class' in raw) {
          add(raw as Doc)
        }
      }
    }
  }
  return Array.from(byId.values())
}

export async function buildRelationshipTablePropsFromMetadata (
  docs: Doc[],
  metadata: BuildMarkdownTableMetadata,
  client: Client
): Promise<CopyRelationshipTableAsMarkdownProps> {
  const hierarchy = client.getHierarchy()
  const cardClass = metadata.cardClass as Ref<Class<Doc>>

  let model: AttributeModel[]
  if (metadata.config !== undefined && metadata.config.length > 0) {
    const config = metadata.config
    const lookup = buildConfigLookup(hierarchy, cardClass, config)
    model = await buildModel({
      client,
      _class: cardClass,
      keys: config,
      lookup
    })
  } else {
    model = await buildTableModel(client, hierarchy, cardClass, undefined)
  }

  if (model.some((attr) => attr.props?.error !== undefined)) {
    throw new TableSourceError('column')
  }

  const viewModel = await rebuildRelationshipTableViewModel(docs, model, cardClass, hierarchy, client)
  return {
    viewModel,
    model,
    objects: docs,
    cardClass,
    language: metadata.language,
    query: metadata.query
  }
}

async function buildRelationshipTableFromMetadata (
  docs: Doc[],
  metadata: BuildMarkdownTableMetadata,
  client: Client
): Promise<string> {
  const hierarchy = client.getHierarchy()
  const props = await buildRelationshipTablePropsFromMetadata(docs, metadata, client)
  const language = tableLanguage(metadata.language)
  return await buildRelationshipTableMarkdown(props, hierarchy, language, client)
}

/**
 * Wrapper function for building markdown table from BuildMarkdownTableMetadata
 * This is used by text-editor-resources to refresh tables
 */
export async function buildMarkdownTableFromMetadata (
  docs: Doc[],
  metadata: BuildMarkdownTableMetadata,
  client: Client
): Promise<string> {
  if (isRelationshipTable(metadata)) {
    return await buildRelationshipTableFromMetadata(docs, metadata, client)
  }

  let viewlet: Viewlet | undefined
  if (metadata.viewletId !== undefined) {
    viewlet = await client.findOne(viewPlugin.class.Viewlet, { _id: metadata.viewletId as Ref<Viewlet> })
  }

  const props: CopyAsMarkdownTableProps = {
    cardClass: metadata.cardClass as Ref<Class<Doc>>,
    language: metadata.language,
    viewlet,
    config: metadata.config,
    query: metadata.query
  }

  return await buildMarkdownTableFromDocs(docs, props, client)
}

/**
 * Build markdown table string from documents and props
 */
export async function buildMarkdownTableFromDocs (
  docs: Doc[],
  props: CopyAsMarkdownTableProps,
  client: Client
): Promise<string> {
  const data = await buildTableData(docs, props, client)
  return await renderMarkdownTable(data, client.getHierarchy())
}

/**
 * Render table data as a markdown table.
 *
 * Escaping and object links live here rather than in the cell loop: other renderers (csv, json)
 * need the plain text, and duplicating the loop is how the two would drift apart.
 */
export async function renderMarkdownTable (data: TableData, hierarchy: Hierarchy): Promise<string> {
  if (data.headers.length === 0) {
    return ''
  }

  const rendered: string[][] = []
  for (let r = 0; r < data.rows.length; r++) {
    const row: string[] = []
    for (let c = 0; c < data.rows[r].length; c++) {
      const value = data.rows[r][c] ?? ''
      if (data.linkColumns.includes(c)) {
        row.push(await createMarkdownLink(hierarchy, data.docs[r], value))
      } else {
        row.push(escapeMarkdownTableCellContent(value))
      }
    }
    rendered.push(row)
  }

  let markdown = '| ' + data.headers.map(escapeMarkdownTableCellContent).join(' | ') + ' |\n'
  markdown += '| ' + data.headers.map(() => '---').join(' | ') + ' |\n'
  for (const row of rendered) {
    markdown += '| ' + row.join(' | ') + ' |\n'
  }

  return markdown
}

export async function buildTableData (
  docs: Doc[],
  props: CopyAsMarkdownTableProps,
  client: Client,
  elementFormatter?: ElementFormatter
): Promise<TableData> {
  const empty: TableData = { headers: [], rows: [], docs: [], linkColumns: [] }

  const hierarchy = client.getHierarchy()
  const cardClass = hierarchy.getClass(props.cardClass)
  if (cardClass == null) {
    return empty
  }

  const { viewlet, config: actualConfig } = await loadViewletConfig(
    client,
    hierarchy,
    props.cardClass,
    props.viewlet,
    props.config
  )

  let displayableModel: AttributeModel[]
  // The config entries the columns were built from, kept as given (with presenters, props, labels)
  // so a refresh rebuilds exactly the same columns. Undefined when columns come from the viewlet.
  let sourceKeys: Array<string | BuildModelKey> | undefined
  if (actualConfig !== undefined && actualConfig.length > 0) {
    const lookup =
      viewlet !== undefined
        ? buildConfigLookup(hierarchy, props.cardClass, actualConfig, viewlet.options?.lookup)
        : undefined
    const hiddenKeys = viewlet?.configOptions?.hiddenKeys ?? []
    const keys = actualConfig.filter((key: string | BuildModelKey) => {
      if (typeof key === 'string') {
        return !hiddenKeys.includes(key)
      }
      return !hiddenKeys.includes(key.key) && key.displayProps?.grow !== true
    })
    const model = await buildModel({ client, _class: props.cardClass, keys, lookup })
    // buildModel returns one column per key, in order (missing ones become error columns).
    const displayable = model.flatMap((attr, index) =>
      attr.displayProps?.grow === true ? [] : [{ attr, key: keys[index] }]
    )
    displayableModel = displayable.map(({ attr }) => attr)
    if (model.length === keys.length) sourceKeys = displayable.map(({ key }) => key)
  } else {
    displayableModel = await buildTableModel(client, hierarchy, props.cardClass, viewlet)
  }

  if (props.strictColumns === true && displayableModel.some((attr) => attr.props?.error !== undefined)) {
    throw new TableSourceError('column')
  }

  if (displayableModel.length === 0) {
    return empty
  }

  // Preload referenced documents for RefTo / ArrOf<RefTo> attributes into $lookup
  await preloadRefLookups(docs, displayableModel, hierarchy, client)
  // Preload associations for $associations keys
  await preloadAssociations(docs, displayableModel, client)

  const language = tableLanguage(props.language)
  const userCache = new Map<PersonId, string>()
  const firstDocClass = docs.length > 0 ? docs[0]._class : props.cardClass
  const headers = await generateHeaders(displayableModel, firstDocClass, hierarchy, language)

  const rows: string[][] = []
  for (const card of docs) {
    const row: string[] = []
    for (let i = 0; i < displayableModel.length; i++) {
      const attr = displayableModel[i]
      const isFirstColumn = i === 0
      const value = await formatValue(
        attr,
        card,
        hierarchy,
        props.cardClass,
        language,
        isFirstColumn,
        userCache,
        props.valueFormatter,
        elementFormatter ?? (attr.key === '' ? async (_doc, title) => title : undefined)
      )
      row.push(value == null ? '' : String(value))
    }
    rows.push(row)
  }

  // The object column carries no attribute of its own; markdown turns it into a link to the row's
  // document, other formats keep the plain title.
  const linkColumns = displayableModel.length > 0 && displayableModel[0].key === '' ? [0] : []

  const config =
    sourceKeys ??
    displayableModel.map((attr) => ({
      key: attr.key === '' && String(attr.label).startsWith('custom') ? String(attr.label) : attr.key,
      label: attr.label,
      props: attr.props,
      displayProps: attr.displayProps,
      sortingKey: attr.sortingKey
    }))
  return { headers, rows, docs: [...docs], linkColumns, config, columnIds: tableColumnIds(config) }
}

/**
 * Build markdown table from relationship table props (viewModel, model, objects)
 */
export async function buildRelationshipTableMarkdown (
  props: CopyRelationshipTableAsMarkdownProps,
  hierarchy: Hierarchy,
  language: string | undefined,
  client: Client
): Promise<string> {
  if (props.model.length === 0) {
    return ''
  }

  const docsForPreload = collectRelationshipDocsForRefPreload(props, hierarchy)
  await preloadRefLookups(docsForPreload, props.model, hierarchy, client)

  const userCache = new Map<PersonId, string>()
  const firstDocClass = props.objects.length > 0 ? props.objects[0]._class : props.cardClass
  const headers = await generateHeaders(props.model, firstDocClass, hierarchy, language)

  const attributeKeyToIndex = new Map<string, number>()
  props.model.forEach((attr, index) => {
    attributeKeyToIndex.set(attr.key, index)
  })

  const rows: MarkupNode[] = []

  for (const rowModel of props.viewModel) {
    const rowCells: MarkupNode[] = []
    const cells = rowModel.cells
      .filter((cell) => cell.rowSpan > 0)
      .sort(
        (a, b) =>
          (attributeKeyToIndex.get(a.attribute.key) ?? Number.MAX_SAFE_INTEGER) -
          (attributeKeyToIndex.get(b.attribute.key) ?? Number.MAX_SAFE_INTEGER)
      )

    for (const cell of cells) {
      const attrIndex = attributeKeyToIndex.get(cell.attribute.key)
      if (attrIndex === undefined) continue

      const isAssociationKey = cell.attribute.key.startsWith('$associations')

      let doc: Doc | undefined
      if (isAssociationKey) {
        doc = cell.object
      } else {
        doc = cell.object ?? cell.parentObject
      }

      if (doc === undefined) {
        rowCells.push({
          type: MarkupNodeType.table_cell,
          attrs: { rowspan: cell.rowSpan },
          content: markdownToTableCellContent('')
        })
        continue
      }

      let docToUse: Doc | undefined = doc
      let docClass = props.cardClass
      let attributeToUse = cell.attribute

      if (isAssociationKey) {
        if (cell.object !== undefined) {
          docToUse = cell.object
          docClass = docToUse._class

          // Strip association prefix for formatValue
          const parts = cell.attribute.key.split('.')
          let lastAssocIndex = -1
          for (let i = 0; i < parts.length; i++) {
            if (parts[i] === '$associations' && i + 1 < parts.length) {
              lastAssocIndex = i
            }
          }
          if (lastAssocIndex !== -1) {
            attributeToUse = {
              ...cell.attribute,
              key: parts.slice(lastAssocIndex + 2).join('.')
            }
          }
        } else {
          docToUse = cell.parentObject
          if (docToUse !== undefined) {
            docClass = docToUse._class
          }
        }
      }

      if (docToUse === undefined) {
        rowCells.push({
          type: MarkupNodeType.table_cell,
          attrs: { rowspan: cell.rowSpan },
          content: markdownToTableCellContent('')
        })
        continue
      }

      const isFirstColumn = attrIndex === 0
      let value = await formatValue(
        attributeToUse,
        docToUse,
        hierarchy,
        docClass,
        language,
        isFirstColumn || isAssociationKey,
        userCache,
        props.valueFormatter
      )

      const isDocumentTitle = attributeToUse.key === '' && docToUse !== undefined
      if (isDocumentTitle) {
        value = await createMarkdownLink(hierarchy, docToUse, value)
      } else {
        value = escapeMarkdownTableCellContent(value == null ? '' : String(value))
      }

      rowCells.push({
        type: MarkupNodeType.table_cell,
        attrs: { rowspan: cell.rowSpan },
        content: markdownToTableCellContent(value)
      })
    }

    rows.push({
      type: MarkupNodeType.table_row,
      content: rowCells
    })
  }

  return markupToMarkdown(buildRelationshipTableMarkup(headers, rows))
}
