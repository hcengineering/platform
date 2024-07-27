import { Document, Element } from 'domhandler'
import { find } from 'domutils'
import { ElementType } from 'htmlparser2'

import { DocMetadataSpec, MetadataContainer, DocTableRowMetadata, DocMetaTagsMetadata } from './types'
import { ELEMENT_LIMIT } from './common'
import { TableNodeExtractor } from './nodes'
import { TableContainer } from './container'

interface DocMetadataExtractor {
  extractName: (doc: Document) => string
  extractId: (doc: Document) => string
}

export class MetaTagsDocMetadataExtractor implements DocMetadataExtractor {
  constructor (readonly metadata: DocMetaTagsMetadata) {}

  private extract (doc: Document, metatagAttrib: string, metatagName: string): string | undefined {
    const allMetaTags = find(
      (n) => n.type === ElementType.Tag && n.tagName === 'meta',
      [doc],
      true,
      ELEMENT_LIMIT
    ) as Element[]

    for (const metatag of allMetaTags) {
      if (
        metatag.attribs[metatagAttrib] === metatagName &&
        metatag.attribs.content != null &&
        metatag.attribs.content !== ''
      ) {
        return metatag.attribs.content
      }
    }
  }

  extractName (doc: Document): string {
    return this.extract(doc, 'name', this.metadata.docNameMetaTag) ?? 'Imported document'
  }

  extractId (doc: Document): string {
    return this.extract(doc, 'name', this.metadata.docIdMetaTag) ?? ''
  }
}

export class TableRowDocMetadataExtractor implements DocMetadataExtractor {
  constructor (
    readonly tableMetadata: DocTableRowMetadata,
    private table: TableContainer | undefined = undefined
  ) {}

  private getTable (doc: Document): TableContainer {
    if (this.table != null) {
      return this.table
    }

    const extractor = new TableNodeExtractor({
      header: this.tableMetadata.tableHeader
    })

    this.table = extractor.extract(doc)
    return this.table
  }

  extractName (doc: Document): string {
    const table = this.getTable(doc)
    return table.getCellText(this.tableMetadata.docName.extract)
  }

  extractId (doc: Document): string {
    const table = this.getTable(doc)
    return table.getCellText(this.tableMetadata.docId.extract)
  }
}

type AnyDocMetadataExtractor = MetaTagsDocMetadataExtractor | TableRowDocMetadataExtractor

export function createMetadataExtractor (metadata: DocMetadataSpec): AnyDocMetadataExtractor {
  switch (metadata.in) {
    case MetadataContainer.MetaTags:
      return new MetaTagsDocMetadataExtractor(metadata)
    case MetadataContainer.TableRow:
      return new TableRowDocMetadataExtractor(metadata)
  }
}
