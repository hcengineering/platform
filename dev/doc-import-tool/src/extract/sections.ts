import { Document } from 'domhandler'
import { Markup } from '@hcengineering/core'

import { GenericNodeSpec, NodeType, SectionSpec, SectionType, TocSectionSpec } from './types'
import { AnyContainer, createNodeExtractor } from './nodes'

/**
 * @public
 * Container for the different types of content that
 * can be found in a document (TOC, history, etc.)
 */
export interface ExtractedSection {
  type: SectionType
  title: string
  content: Markup
}

export function extractSections (doc: Document, sectionSpecs: SectionSpec[]): ExtractedSection[] {
  const sections: ExtractedSection[] = []

  for (const section of sectionSpecs) {
    const sectionExtractor = new SectionExtractor(section)
    try {
      const extractedSection = sectionExtractor.extract(doc)
      sections.push({
        type: section.type,
        title: extractedSection.getTitle(),
        content: extractedSection.getContent()
      })
    } catch (err: any) {
      console.warn(err)
    }
  }

  return sections
}

export class SectionExtractor {
  constructor (readonly spec: SectionSpec) {}

  extract (doc: Document): AnyContainer {
    const nodeSpec = this.spec.node
    const nodeExtractor = createNodeExtractor(nodeSpec.type, nodeSpec.params)
    return nodeExtractor.extract(doc)
  }
}

export class TocSectionExtractor {
  constructor (readonly spec: TocSectionSpec) {}

  extract (doc: Document): ExtractedSection[] {
    const tocExtractor = new SectionExtractor(this.spec)

    const tocNode = tocExtractor.extract(doc)

    const { tags } = this.spec.node.params.sectionHeaders
    const sectionSpecs: SectionSpec[] = []
    let prevNodeSpec: GenericNodeSpec | undefined

    for (const sec of tocNode.getArray()) {
      if (prevNodeSpec != null) {
        prevNodeSpec.params.end = {
          tags,
          patterns: [sec.getText()]
        }
      }

      const node: GenericNodeSpec = {
        type: NodeType.GENERIC,
        params: {
          start: {
            tags,
            patterns: [sec.getText()]
          },
          end: undefined
        }
      }

      sectionSpecs.push({ type: SectionType.GENERIC, node })

      prevNodeSpec = node
    }

    return extractSections(doc, sectionSpecs)
  }
}
