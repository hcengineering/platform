import { Asset, IntlString, Resource } from '@hcengineering/platform'
import { Doc } from '@hcengineering/core'
import type { AnySvelteComponent } from '@hcengineering/ui'

/**
 * @public
 */
export interface TextEditorHandler {
  insertText: (html: string) => void
  insertTemplate: (name: string, html: string) => void
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

/**
 * @public
 */
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
  'heading',
  'table'
] as const

/**
 * @public
 */
export type FormatMode = (typeof FORMAT_MODES)[number]

/**
 * @public
 */
export const CollaborationIds = {
  Doc: 'text-editor.collaborator.document',
  Provider: 'text-editor.collaborator.provider'
}

export interface RefAction {
  label: IntlString
  icon: Asset | AnySvelteComponent
  action: RefInputAction
  order: number
  fill?: string
  disabled?: boolean
}
