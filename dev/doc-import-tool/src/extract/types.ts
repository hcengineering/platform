import z from 'zod'

import { readFile } from '../helpers'

// #region Node

export enum NodeType {
  GENERIC = 'generic',
  LIST = 'list',
  TABLE = 'table',
  TOC_PARA_SEQ = 'toc-paragraph-seq'
}

const tags = z.object({
  tags: z.array(z.string())
})

const tagsWithText = tags.merge(
  z.object({
    patterns: z.array(z.string()).min(1)
  })
)

const tableHeaderCell = z.object({
  col: z.number().min(0),
  content: z.string().min(1)
})

const tableParams = z.object({
  header: tableHeaderCell
})

const listParams = z.object({
  start: tagsWithText,
  title: z.string().optional()
})

const genericParams = z.object({
  start: tagsWithText,
  end: z.union([tagsWithText, tags]).optional()
})

const tocParaSeqParams = z.object({
  start: tagsWithText,
  sectionHeaders: tags,
  end: tags
})

const tableNode = z.object({
  type: z.literal(NodeType.TABLE),
  params: tableParams
})

const listNode = z.object({
  type: z.literal(NodeType.LIST),
  params: listParams
})

const genericNode = z.object({
  type: z.literal(NodeType.GENERIC),
  params: genericParams
})

const tocParagraphSequence = z.object({
  type: z.literal(NodeType.TOC_PARA_SEQ),
  params: tocParaSeqParams
})

const node = z.discriminatedUnion('type', [tableNode, listNode, genericNode, tocParagraphSequence])

export type ListParams = z.infer<typeof listParams>
export type TableParams = z.infer<typeof tableParams>
export type GenericParams = z.infer<typeof genericParams>
export type TocParaSeqParams = z.infer<typeof tocParaSeqParams>

export type TocParaSeqNodeSpec = z.infer<typeof tocParagraphSequence>
export type GenericNodeSpec = z.infer<typeof genericNode>
export type TagsWithTextSpec = z.infer<typeof tagsWithText>
export type TagsSpec = z.infer<typeof tags>

// #endregion

// #region SectionSpec

export enum SectionType {
  TOC = 'toc',
  DOC_HISTORY = 'doc-history',
  RELATED_DOCS = 'related-docs',
  GENERIC = 'generic'
}

const genericSection = z.object({
  type: z.union([
    z.literal(SectionType.DOC_HISTORY),
    z.literal(SectionType.RELATED_DOCS),
    z.literal(SectionType.GENERIC)
  ]),
  node
})

const tocSection = z.object({
  type: z.literal(SectionType.TOC),
  node: tocParagraphSequence
})

const section = z.union([tocSection, genericSection])

export type SectionSpec = z.infer<typeof section>
export type TocSectionSpec = z.infer<typeof tocSection>

// #endregion

// #region Metadata

export enum MetadataContainer {
  MetaTags = 'meta-tags',
  TableRow = 'table-row',
  PageHeaderTableRow = 'page-header-table-row'
}

const metaTagsMetadata = z.object({
  in: z.literal(MetadataContainer.MetaTags),
  docNameMetaTag: z.string().min(1),
  docIdMetaTag: z.string().min(1)
})

const metadataTableCell = z.object({
  extract: z.object({
    row: z.number().min(0),
    col: z.number().min(0),
    slice: z
      .object({
        start: z.number().optional(),
        end: z.number().optional()
      })
      .optional()
  })
})
export type MetadataTableCell = z.infer<typeof metadataTableCell>

const tableRowMetadata = z.object({
  in: z.literal(MetadataContainer.TableRow),
  tableHeader: tableHeaderCell,
  docName: metadataTableCell,
  docId: metadataTableCell
})

const pageHeaderTableRowMetadata = z.object({
  in: z.literal(MetadataContainer.PageHeaderTableRow),
  headerIdx: z.number().min(1).optional(),
  docName: metadataTableCell,
  docId: metadataTableCell
})

const docMetadata = z.union([metaTagsMetadata, tableRowMetadata, pageHeaderTableRowMetadata])

export type DocMetadataSpec = z.infer<typeof docMetadata>
export type DocMetaTagsMetadata = z.infer<typeof metaTagsMetadata>
export type DocTableRowMetadata = z.infer<typeof tableRowMetadata>
export type PageHeaderTableRowMetadata = z.infer<typeof pageHeaderTableRowMetadata>

// #endregion

// #region FileSpec

export enum FileSpecType {
  // sections in TOC are mapped to the sections in the document
  TOC = 'toc'
}

const tocFile = z.object({
  prefix: z.string().min(1),
  metadata: docMetadata,
  type: z.literal(FileSpecType.TOC),
  spec: z.object({
    toc: tocSection,
    sections: z.array(genericSection).optional()
  })
})

export type FileSpec = z.infer<typeof tocFile>
export type TocFileSpec = z.infer<typeof tocFile>

// #endregion

export async function read (specFile?: string): Promise<FileSpec> {
  if (specFile == null) {
    return DEFAULT_SPEC
  }

  const buffer = await readFile(specFile)
  return tocFile.parse(JSON.parse(buffer))
}

export const DEFAULT_SPEC: FileSpec = {
  prefix: 'IMPORTED',
  type: FileSpecType.TOC,
  metadata: {
    in: MetadataContainer.TableRow,
    tableHeader: {
      col: 0,
      content: 'title:'
    },
    docName: {
      extract: { row: 0, col: 1 }
    },
    docId: {
      extract: { row: 1, col: 1 }
    }
  },
  spec: {
    toc: {
      type: SectionType.TOC,
      node: {
        type: NodeType.TOC_PARA_SEQ,
        params: {
          sectionHeaders: {
            tags: ['h1']
          },
          start: {
            patterns: ['Table of contents', 'Table des matières'],
            tags: ['h1', 'h2', 'h3', 'p']
          },
          end: {
            tags: ['h1']
          }
        }
      }
    },
    sections: [
      {
        type: SectionType.RELATED_DOCS,
        node: {
          type: NodeType.LIST,
          params: {
            start: {
              tags: ['h2'],
              patterns: ['related documents']
            },
            title: 'related-docs'
          }
        }
      }
    ]
  }
}
