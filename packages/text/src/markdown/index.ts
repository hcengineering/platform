import { MarkupNode, markupToJSON } from '@hcengineering/text-core'
import { Extensions } from '@tiptap/core'
import { defaultExtensions } from '../extensions'
import { MarkdownParser } from './parser'
import { MarkdownState, storeMarks, storeNodes } from './serializer'

/**
 * @public
 */
export function parseMessageMarkdown (
  message: string | undefined,
  imageUrl: string,
  refUrl: string = 'ref://',
  extensions: Extensions = defaultExtensions
): MarkupNode {
  const parser = new MarkdownParser(extensions, refUrl, imageUrl)
  return parser.parse(message ?? '')
}

/**
 * @public
 */
export function serializeMessage (node: MarkupNode, refUrl: string, imageUrl: string): string {
  const state = new MarkdownState(storeNodes, storeMarks, { tightLists: true, refUrl, imageUrl })
  state.renderContent(node)
  return state.out
}

/**
 * @public
 */
export async function markupToMarkdown (
  markup: string,
  refUrl: string = 'ref://',
  imageUrl: string = 'http://localhost',
  preprocessor?: (nodes: MarkupNode) => Promise<void>
): Promise<string> {
  const json = markupToJSON(markup)
  await preprocessor?.(json)
  return serializeMessage(json, refUrl, imageUrl)
}
