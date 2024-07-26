import { parseDocument } from 'htmlparser2'
import { Document } from 'domhandler'

import { FileSpec, FileSpecType, TocFileSpec } from './types'
import { createMetadataExtractor } from './meta'
import { ExtractedSection, TocSectionExtractor, extractSections } from './sections'

/**
 * @public
 * Top-level container for extracted data
 */
export interface ExtractedFile {
  title: string
  oldId: string
  prefix: string
  sections: ExtractedSection[]
  metaSections?: ExtractedSection[]
}

interface ContentExtractor {
  type: FileSpecType
  extract: (doc: Document) => ExtractedFile
}

class TocContentExtractor implements ContentExtractor {
  constructor (
    readonly spec: TocFileSpec,
    readonly type = FileSpecType.TOC
  ) {}

  extract (doc: Document): ExtractedFile {
    const metadataExtractor = createMetadataExtractor(this.spec.metadata)
    const title = metadataExtractor.extractName(doc)
    const oldId = metadataExtractor.extractId(doc)

    const docSpec = this.spec.spec

    const tocSectionSpec = docSpec.toc
    const tocExtractor = new TocSectionExtractor(tocSectionSpec)

    const sections = tocExtractor.extract(doc)

    let metaSections: ExtractedSection[] | undefined
    if (docSpec.sections != null) {
      metaSections = extractSections(doc, docSpec.sections)
    }

    return {
      title,
      oldId,
      prefix: this.spec.prefix,
      sections,
      metaSections
    }
  }
}

/**
 * @public
 * Extracts HTML file contents
 */
export async function extract (contents: string, spec: FileSpec): Promise<ExtractedFile> {
  const extractor = new TocContentExtractor(spec)
  const doc = parseDocument(contents)
  return extractor.extract(doc)
}

export default extract
