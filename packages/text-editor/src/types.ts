import { Asset, IntlString, Resource } from '@hcengineering/platform'
import { Doc } from '@hcengineering/core'

/**
 * @public
 */
export interface TextEditorHandler {
  insertText: (html: string) => void
}
/**
 * @public
 */
export type RefInputAction = (element: HTMLElement, editor: TextEditorHandler) => void
/**
 * A contribution to reference input control, to allow to add more actions to it.
 * @public
 */
export interface RefInputActionItem extends Doc {
  label: IntlString
  icon: Asset

  // Query for documents with pattern
  action: Resource<RefInputAction>

  order?: number
}

export const FORMAT_MODES = [
  'bold',
  'italic',
  'strike',
  'link',
  'orderedList',
  'bulletList',
  'blockquote',
  'code',
  'codeBlock',
  'heading'
] as const

export type FormatMode = typeof FORMAT_MODES[number]
