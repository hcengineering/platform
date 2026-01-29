//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { Class, Client, Doc, Hierarchy, Ref, PersonId } from '@hcengineering/core'
import { getCurrentLanguage } from '@hcengineering/theme'
import type { AttributeModel, BuildMarkdownTableMetadata, TableMetadata, Viewlet } from '@hcengineering/view'
import viewPlugin from '@hcengineering/view'
import { buildConfigLookup, buildModel, getAttributeValue } from '@hcengineering/view-resources'
import type { CopyAsMarkdownTableProps, CopyRelationshipTableAsMarkdownProps } from '../types'
import { formatValue } from '../formatter'
import { generateHeaders, loadViewletConfig, buildTableModel } from '../model'
import { rebuildRelationshipTableViewModel, isRelationshipTable } from '../data'
import { escapeMarkdownLinkText } from './escape'
import { createMarkdownLink } from './link'

async function buildRelationshipTableFromMetadata (
  docs: Doc[],
  metadata: BuildMarkdownTableMetadata,
  client: Client
): Promise<string> {
  const hierarchy = client.getHierarchy()
  const cardClass = metadata.cardClass as Ref<Class<Doc>>

  const config = metadata.config ?? []
  const lookup = buildConfigLookup(hierarchy, cardClass, config)
  const model = await buildModel({
    client,
    _class: cardClass,
    keys: config,
    lookup
  })

  const viewModel = await rebuildRelationshipTableViewModel(docs, model, cardClass, hierarchy, client)

  const props: CopyRelationshipTableAsMarkdownProps = {
    viewModel,
    model,
    objects: docs,
    cardClass,
    query: metadata.query
  }

  const language = getCurrentLanguage()
  return await buildRelationshipTableMarkdown(props, hierarchy, language)
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
  const tableMetadata = metadata as TableMetadata
  if (isRelationshipTable(tableMetadata)) {
    return await buildRelationshipTableFromMetadata(docs, metadata, client)
  }

  let viewlet: Viewlet | undefined
  if (metadata.viewletId !== undefined) {
    viewlet = await client.findOne(viewPlugin.class.Viewlet, { _id: metadata.viewletId as Ref<Viewlet> })
  }

  const props: CopyAsMarkdownTableProps = {
    cardClass: metadata.cardClass as Ref<Class<Doc>>,
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
  if (docs.length === 0) {
    return ''
  }

  const hierarchy = client.getHierarchy()
  const cardClass = hierarchy.getClass(props.cardClass)
  if (cardClass == null) {
    return ''
  }

  const { viewlet, config: actualConfig } = await loadViewletConfig(
    client,
    hierarchy,
    props.cardClass,
    props.viewlet,
    props.config
  )

  let displayableModel: AttributeModel[]
  if (actualConfig !== undefined && actualConfig.length > 0) {
    const lookup =
      viewlet !== undefined
        ? buildConfigLookup(hierarchy, props.cardClass, actualConfig, viewlet.options?.lookup)
        : undefined
    const hiddenKeys = viewlet?.configOptions?.hiddenKeys ?? []
    const model = await buildModel({
      client,
      _class: props.cardClass,
      keys: actualConfig.filter((key: string | import('@hcengineering/view').BuildModelKey) => {
        if (typeof key === 'string') {
          return !hiddenKeys.includes(key)
        }
        return !hiddenKeys.includes(key.key) && key.displayProps?.grow !== true
      }),
      lookup
    })
    displayableModel = model.filter((attr) => attr.displayProps?.grow !== true)
  } else {
    displayableModel = await buildTableModel(client, hierarchy, props.cardClass, viewlet)
  }

  if (displayableModel.length === 0) {
    return ''
  }

  const language = getCurrentLanguage()
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
        props.valueFormatter
      )

      if (isFirstColumn && attr.key === '') {
        const linkValue = await createMarkdownLink(hierarchy, card, value)
        row.push(linkValue)
      } else {
        row.push(escapeMarkdownLinkText(value))
      }
    }
    rows.push(row)
  }

  let markdown = '| ' + headers.join(' | ') + ' |\n'
  markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n'
  for (const row of rows) {
    markdown += '| ' + row.join(' | ') + ' |\n'
  }

  return markdown
}

/**
 * Build markdown table from relationship table props (viewModel, model, objects)
 */
export async function buildRelationshipTableMarkdown (
  props: CopyRelationshipTableAsMarkdownProps,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string> {
  if (props.viewModel.length === 0 || props.model.length === 0) {
    return ''
  }

  const userCache = new Map<PersonId, string>()
  const firstDocClass = props.objects.length > 0 ? props.objects[0]._class : props.cardClass
  const headers = await generateHeaders(props.model, firstDocClass, hierarchy, language)

  const attributeKeyToIndex = new Map<string, number>()
  props.model.forEach((attr, index) => {
    attributeKeyToIndex.set(attr.key, index)
  })

  const activeRowSpans = new Map<string, { value: string, remaining: number }>()
  const rows: string[][] = []

  for (let rowIdx = 0; rowIdx < props.viewModel.length; rowIdx++) {
    const rowModel = props.viewModel[rowIdx]
    const row: string[] = new Array(headers.length).fill('')

    for (const [attrKey, spanInfo] of activeRowSpans.entries()) {
      if (spanInfo.remaining > 0) {
        const attrIndex = attributeKeyToIndex.get(attrKey)
        if (attrIndex !== undefined) {
          row[attrIndex] = spanInfo.value
          spanInfo.remaining--
          if (spanInfo.remaining === 0) {
            activeRowSpans.delete(attrKey)
          }
        }
      }
    }

    for (const cell of rowModel.cells) {
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
        row[attrIndex] = ''
        continue
      }

      const rawValue = getAttributeValue(cell.attribute, doc, hierarchy)

      let docToUse = doc
      let docClass = props.cardClass
      let attributeToUse = cell.attribute

      if (isAssociationKey) {
        if (rawValue !== undefined && rawValue !== null && typeof rawValue === 'object' && '_class' in rawValue) {
          docToUse = rawValue as Doc
          docClass = docToUse._class
          const parts = cell.attribute.key.split('$associations.')
          if (parts.length > 1) {
            const afterAssoc = parts[1].substring(1)
            const dotIndex = afterAssoc.indexOf('.')
            if (dotIndex > 0) {
              const attributeName = afterAssoc.substring(dotIndex + 1)
              attributeToUse = {
                ...cell.attribute,
                key: attributeName
              }
            } else {
              attributeToUse = {
                ...cell.attribute,
                key: ''
              }
            }
          }
        }
      }

      const isFirstColumn = attrIndex === 0
      const allowEmptyKey = isFirstColumn || isAssociationKey
      let value = await formatValue(
        attributeToUse,
        docToUse,
        hierarchy,
        docClass,
        language,
        allowEmptyKey,
        userCache,
        props.valueFormatter
      )

      const isDocumentTitle = attributeToUse.key === '' && docToUse !== undefined
      if (isDocumentTitle) {
        value = await createMarkdownLink(hierarchy, docToUse, value)
      } else {
        value = escapeMarkdownLinkText(value)
      }

      row[attrIndex] = value

      if (cell.rowSpan > 1) {
        activeRowSpans.set(cell.attribute.key, {
          value,
          remaining: cell.rowSpan - 1
        })
      }
    }

    rows.push(row)
  }

  let markdown = '| ' + headers.join(' | ') + ' |\n'
  markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n'
  for (const row of rows) {
    markdown += '| ' + row.join(' | ') + ' |\n'
  }

  return markdown
}
