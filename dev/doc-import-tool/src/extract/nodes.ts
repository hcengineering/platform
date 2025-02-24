import { Document, Element, AnyNode as AnyDomNode, AnyNode } from 'domhandler'
import { ElementType } from 'htmlparser2'
import {
  compareDocumentPosition,
  findAll,
  findOne,
  getChildren,
  getOuterHTML,
  innerText,
  removeSubsets
} from 'domutils'

import { NodeType, ListParams, TableParams, GenericParams, TocParaSeqParams, TagsWithTextSpec, TagsSpec } from './types'
import { clean, compareStrExact } from '../helpers'
import { Container, GenericContainer, ListContainer, TableContainer } from './container'

// Copied from domutils ambient const enums to solve 'isolatedModules' is enabled
const enum DocumentPosition {
  DISCONNECTED = 1,
  PRECEDING = 2,
  FOLLOWING = 4,
  CONTAINS = 8,
  CONTAINED_BY = 16
}

function defaultPatternComparison (n: Element, spec: TagsWithTextSpec | TagsSpec): boolean {
  const text = clean(innerText(n))
  return !('patterns' in spec) || spec.patterns.some((p) => compareStrExact(p, text))
}

function getNode (
  doc: Document,
  spec: TagsWithTextSpec | TagsSpec,
  patternComparison?: (n: Element, spec: TagsWithTextSpec | TagsSpec) => boolean
): Element | null {
  return findOne(
    (n) => {
      const tag = n.tagName
      if (!spec.tags.includes(tag)) {
        return false
      }

      const text = clean(innerText(n))
      if (text === '') {
        return false
      }

      const comparisonFunc = patternComparison ?? defaultPatternComparison
      return comparisonFunc(n, spec)
    },
    doc.children,
    true
  )
}

function getInbetweenNodes (
  doc: Document,
  start: TagsWithTextSpec,
  end?: TagsWithTextSpec | TagsSpec,
  raiseIfEmpty = true
): { startNode: AnyDomNode, inbetweenNodes: AnyDomNode[] } {
  const startNode = getNode(doc, start)

  if (startNode == null) {
    throw new Error(`Failed to find start node with spec: ${JSON.stringify(start)}`)
  }

  let endNode: Element | null
  if (end != null) {
    const comparisonFunc = (n: Element, spec: TagsWithTextSpec | TagsSpec): boolean =>
      compareDocumentPosition(n, startNode) === DocumentPosition.FOLLOWING && defaultPatternComparison(n, end)

    endNode = getNode(doc, end, comparisonFunc)

    if (endNode == null) {
      throw new Error(`Failed to find end node with spec: ${JSON.stringify(end)}, start: ${JSON.stringify(start)}`)
    }
  }

  const inbetweenNodes = removeSubsets(
    findAll(
      (n) =>
        compareDocumentPosition(n, startNode) === DocumentPosition.FOLLOWING &&
        (endNode == null || compareDocumentPosition(n, endNode) === DocumentPosition.PRECEDING),
      doc.children
    ).filter((n) => clean(innerText(n)) !== '' || findOne((n) => n.tagName === 'img', n.children, true) !== null)
  )

  if (raiseIfEmpty && inbetweenNodes.length === 0) {
    throw new Error(`Failed to extract text content between: '${JSON.stringify(start)}' and '${JSON.stringify(end)}'`)
  }

  return { startNode, inbetweenNodes }
}

interface NodeExtractor {
  extract: (doc: Document) => Container
}

export class TableNodeExtractor implements NodeExtractor {
  constructor (public readonly params: TableParams) {}

  private parseRows (table: AnyDomNode): AnyNode[][] {
    const header = findOne((n) => n.tagName === 'thead', [table])
    const body = findOne((n) => n.tagName === 'tbody', [table])
    let bodyRows =
      body != null
        ? getChildren(body).filter((n) => clean(innerText(n)) !== '')
        : findAll((n) => n.tagName === 'tr' && clean(innerText(n)) !== '', [table])

    if (header != null) {
      const firstRow = findOne((n) => n.tagName === 'tr', [header])

      if (bodyRows.length > 0) {
        if (getChildren(bodyRows[0]).find((n) => n.type === ElementType.Tag && n.tagName === 'th') != null) {
          bodyRows = bodyRows.slice(1)
        }
      }

      return [
        findAll((n) => n.tagName === 'th', firstRow != null ? [firstRow] : []),
        ...bodyRows.map((r) =>
          getChildren(r).filter((n) => n.type === ElementType.Tag && (n.tagName === 'td' || n.tagName === 'th'))
        )
      ]
    } else if (bodyRows.length > 0) {
      return [
        getChildren(bodyRows[0]).filter(
          (n) => n.type === ElementType.Tag && (n.tagName === 'td' || n.tagName === 'th')
        ),
        ...bodyRows
          .slice(1)
          .map((r) =>
            getChildren(r).filter((n) => n.type === ElementType.Tag && (n.tagName === 'td' || n.tagName === 'th'))
          )
      ]
    }

    return []
  }

  extract (doc: Document): TableContainer {
    const allTables = removeSubsets(findAll((n) => n.tagName === 'table', doc.children))
    for (const table of allTables) {
      const rows = this.parseRows(table)
      if (rows.length === 0) {
        continue
      }

      const header = rows[0]
      if (
        header.length > this.params.header.col &&
        compareStrExact(clean(innerText(header[this.params.header.col])), this.params.header.content)
      ) {
        const container = new TableContainer('', getOuterHTML(table))

        for (const [i, row] of rows.entries()) {
          for (const [j, cell] of row.entries()) {
            container.setCell({ row: i, col: j }, new GenericContainer('', getOuterHTML(cell), clean(innerText(cell))))
          }
        }

        return container
      }
    }

    throw new Error(`Failed to find table with header: ${JSON.stringify(this.params.header)}`)
  }
}

class ListNodeExtractor implements NodeExtractor {
  constructor (public readonly params: ListParams) {}

  extract (doc: Document): ListContainer {
    const startNode = findOne(
      (n) =>
        this.params.start.tags.includes(n.tagName) &&
        this.params.start.patterns.some((p) => compareStrExact(p, clean(innerText(n)))),
      doc.children,
      true
    )

    if (startNode == null) {
      throw new Error(`Failed to find list node start node: ${JSON.stringify(this.params.start)}`)
    }

    const list = findOne(
      (n) => {
        return (
          ['ul', 'ol'].includes(n.tagName) &&
          (compareDocumentPosition(n, startNode) === DocumentPosition.FOLLOWING ||
            compareDocumentPosition(n, startNode) === DocumentPosition.CONTAINED_BY)
        )
      },
      doc.children,
      true
    )

    if (list == null) {
      throw new Error(`Failed to find list node after ${clean(innerText(startNode))}`)
    }

    return ListContainer.fromContent(getOuterHTML(list), this.params.title)
  }
}

class TocParagraphSequenceNodeExtractor implements NodeExtractor {
  constructor (public readonly params: TocParaSeqParams) {}

  extract (doc: Document): ListContainer {
    const { startNode, inbetweenNodes } = getInbetweenNodes(doc, this.params.start, this.params.end, false)
    const tocSectionHeaders = inbetweenNodes

    const sectionHeaderTags = this.params.sectionHeaders.tags

    // filter section headers having any of sectionHeader tags
    const sectionHeaders = findAll(
      (n) =>
        sectionHeaderTags.includes(n.tagName) &&
        tocSectionHeaders.some((h) => {
          const tocHeader = clean(innerText(h))
          const possibleSectionHeader = clean(innerText(n))
          return compareStrExact(tocHeader, possibleSectionHeader)
        }),
      doc.children
    )

    return new ListContainer(
      clean(innerText(startNode)),
      sectionHeaders.map((n) => clean(getOuterHTML(n))).join(''),
      sectionHeaders.map((n) => {
        const title = clean(innerText(n))
        return new GenericContainer(title, clean(getOuterHTML(n)), title)
      })
    )
  }
}

class GenericNodeExtractor implements NodeExtractor {
  constructor (public readonly params: GenericParams) {}

  extract (doc: Document): GenericContainer {
    const { startNode, inbetweenNodes } = getInbetweenNodes(doc, this.params.start, this.params.end)

    return new GenericContainer(clean(innerText(startNode)), inbetweenNodes.map((n) => clean(getOuterHTML(n))).join(''))
  }
}

function setTextMatchingParams (params: ListParams | GenericParams | TocParaSeqParams): void {
  params.start.patterns = params.start.patterns.map((p) => p.toLowerCase())

  if ('end' in params && params.end != null && 'patterns' in params.end) {
    params.end.patterns = params.end.patterns.map((p) => p.toLowerCase())
  }
}

type NodeParams = ListParams | TableParams | GenericParams | TocParaSeqParams
type AnyNodeExtractor =
  | TableNodeExtractor
  | ListNodeExtractor
  | GenericNodeExtractor
  | TocParagraphSequenceNodeExtractor

export type AnyContainer = TableContainer | ListContainer | GenericContainer

export function createNodeExtractor (type: NodeType, params: NodeParams): AnyNodeExtractor {
  switch (type) {
    case NodeType.LIST:
      setTextMatchingParams(params as ListParams)
      return new ListNodeExtractor(params as ListParams)
    case NodeType.TABLE:
      return new TableNodeExtractor(params as TableParams)
    case NodeType.GENERIC:
      setTextMatchingParams(params as GenericParams)
      return new GenericNodeExtractor(params as GenericParams)
    case NodeType.TOC_PARA_SEQ:
      setTextMatchingParams(params as TocParaSeqParams)
      return new TocParagraphSequenceNodeExtractor(params as TocParaSeqParams)
  }
}
