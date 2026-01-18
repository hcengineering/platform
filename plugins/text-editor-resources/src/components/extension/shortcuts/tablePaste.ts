//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { markdownToMarkup } from '@hcengineering/text-markdown'
import { Extension } from '@tiptap/core'
import { Fragment, Node } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'

// TableMetadata type - matches the definition in @hcengineering/view-resources
// Defined here to avoid circular dependency (view-resources depends on text-editor-resources)
interface TableMetadata {
  version: string
  cardClass: string
  viewletId?: string
  config?: Array<string | Record<string, any>>
  query?: Record<string, any>
  documentIds: string[]
  timestamp: number
  workspace?: string
}

export const TableMetadataPasteExtension = Extension.create({
  name: 'tableMetadataPaste',

  addProseMirrorPlugins () {
    return [TableMetadataPastePlugin()]
  }
})

/**
 * Extract metadata from HTML comments in markdown or HTML text
 * Looks for pattern: <!-- huly-table-metadata:{json} -->
 * Returns both the metadata and the text with comment removed
 */
function extractMetadataFromHtmlComments (text: string): { metadata: TableMetadata | null, cleanedText: string } {
  // Look for HTML comment with pattern: <!-- huly-table-metadata:{json} -->
  const commentRegex = /<!--\s*huly-table-metadata:(.+?)\s*-->/s
  const match = text.match(commentRegex)
  if (match?.[1] !== undefined) {
    try {
      const metadata = JSON.parse(match[1]) as TableMetadata
      // Remove the HTML comment from the text
      const cleanedText = text.replace(commentRegex, '').trim()
      return { metadata, cleanedText }
    } catch (e) {
      console.warn('Failed to parse metadata from HTML comment:', e)
    }
  }
  return { metadata: null, cleanedText: text }
}

function TableMetadataPastePlugin (): Plugin {
  return new Plugin({
    props: {
      handlePaste: (view, event, slice) => {
        const clipboardData = event.clipboardData
        if (clipboardData === null) return false

        // Try to get metadata from multiple sources (priority order)
        let metadata: TableMetadata | null = null

        // 1. Try custom MIME type (fastest, most reliable for internal paste)
        const metadataType = 'application/x-huly-table-metadata'
        if (clipboardData.types.includes(metadataType)) {
          try {
            const metadataJsonStr = clipboardData.getData(metadataType)
            metadata = JSON.parse(metadataJsonStr) as TableMetadata
          } catch (e) {
            console.warn('Failed to parse metadata from MIME type:', e)
          }
        }

        // Track cleaned markdown text (with HTML comments removed)
        let cleanedMarkdown: string | null = null

        // 2. Try HTML comments in markdown (fallback, works across browsers)
        if (metadata === null) {
          const markdownText = clipboardData.getData('text/markdown')
          if (markdownText?.length > 0) {
            const result = extractMetadataFromHtmlComments(markdownText)
            if (result.metadata !== null) {
              metadata = result.metadata
              cleanedMarkdown = result.cleanedText
            }
          }
        }

        // 3. Try HTML comments in plain text (for old browsers that only provide text/plain)
        if (metadata === null) {
          const plainText = clipboardData.getData('text/plain')
          if (plainText?.length > 0) {
            const result = extractMetadataFromHtmlComments(plainText)
            if (result.metadata !== null) {
              metadata = result.metadata
              cleanedMarkdown = result.cleanedText
            }
          }
        }

        if (metadata === null) {
          return false // Not our table, let other handlers process
        }

        try {
          // Get markdown or plain text content, using cleaned version if available
          let markdown: string
          if (cleanedMarkdown !== null) {
            // Use cleaned markdown (HTML comment already removed)
            markdown = cleanedMarkdown
          } else {
            // Metadata came from custom MIME type, but markdown might still have HTML comment
            const markdownText = clipboardData.getData('text/markdown')
            const plainText = clipboardData.getData('text/plain')

            if (markdownText !== '' && markdownText.length > 0) {
              markdown = markdownText
            } else if (plainText !== '' && plainText.length > 0) {
              markdown = plainText
            } else {
              return false
            }

            // Remove HTML comment if present (markdown might have it even if metadata came from MIME type)
            const result = extractMetadataFromHtmlComments(markdown)
            markdown = result.cleanedText
          }

          if (markdown.length === 0) {
            return false
          }

          // Check if we're in a code block (don't process tables there)
          const { $from } = view.state.selection
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d)
            if (node.type.name === 'codeBlock') {
              return false // Paste as plain text in code blocks
            }
          }

          // Parse markdown to ProseMirror nodes
          const markupNode = markdownToMarkup(markdown)
          const content = Node.fromJSON(view.state.schema, markupNode)

          // Check if the content contains a table
          let hasTable = false
          content.descendants((node) => {
            if (node.type.name === 'table') {
              hasTable = true
              return false // Stop after first table
            }
          })

          if (hasTable) {
            const metadataAttr = JSON.stringify(metadata)

            // Rebuild content with metadata in table nodes
            const rebuildNode = (node: Node): Node => {
              // Text nodes cannot be recreated, return as-is
              if (node.isText) {
                return node
              }

              if (node.type.name === 'table') {
                const newAttrs = { ...node.attrs, tableMetadata: metadataAttr }
                const newContent = rebuildFragment(node.content)
                return node.type.create(newAttrs, newContent, node.marks)
              }

              // For other nodes, rebuild content but keep original attributes and marks
              const newContent = rebuildFragment(node.content)
              return node.type.create(node.attrs, newContent, node.marks)
            }

            const rebuildFragment = (fragment: Fragment): Fragment => {
              if (fragment.size === 0) {
                return fragment
              }
              const nodes: Node[] = []
              fragment.forEach((node) => {
                nodes.push(rebuildNode(node))
              })
              return Fragment.fromArray(nodes)
            }

            const modifiedContent = rebuildNode(content)
            const transaction = view.state.tr.replaceSelectionWith(modifiedContent)
            view.dispatch(transaction)
            return true // Handled
          }
        } catch (e) {
          console.warn('Failed to parse table metadata:', e)
          // Fall back to normal paste
        }

        return false
      }
    }
  })
}
